// Knowledge Board — UI layer.
// Holds a local cache of the board for synchronous rendering, and writes
// every mutation through to Supabase via DB (db.js). On any persistence
// error the local change is reverted by reloading from the server.

'use strict';

/* ---------------------------------------------------------------- state --- */

const store = {
  topics: [],
  selectedTopicId: null,

  get selectedTopic() {
    return this.topics.find(t => t.id === this.selectedTopicId) || null;
  },
};

/* ------------------------------------------------------------- helpers --- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Only http(s) links are ever rendered as clickable — blocks javascript:
// and other schemes from executing if stored (e.g. via direct DB edits).
function isSafeUrl(url) {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const c of [].concat(children)) {
    if (c != null) node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
};

const statusEl = $('[data-status]');
function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? 'var(--danger)' : '';
  statusEl.style.borderColor = isError ? 'var(--danger)' : '';
}

// Run a persistence action; on failure show the error and resync from server.
async function persist(action, pending = 'Saving…') {
  setStatus(pending);
  try {
    await action();
    setStatus('Synced');
  } catch (err) {
    console.error(err);
    setStatus(err.message || 'Sync failed', true);
    await reload().catch(() => {});
  }
}

/* --------------------------------------------------------------- render --- */

const els = {
  topicList: $('[data-topic-list]'),
  topicsEmpty: $('[data-topics-empty]'),
  currentTopic: $('[data-current-topic]'),
  cardFlow: $('[data-card-flow]'),
  cardsEmpty: $('[data-cards-empty]'),
};

function render() {
  renderTopics();
  renderCards();
}

function renderTopics() {
  els.topicList.replaceChildren();
  els.topicsEmpty.hidden = store.topics.length > 0;

  for (const topic of store.topics) {
    const selected = topic.id === store.selectedTopicId;

    const name = el('button', {
      className: 'topic-item__name',
      type: 'button',
      textContent: topic.name,
      onclick: () => { store.selectedTopicId = topic.id; render(); },
    });

    const count = el('span', { className: 'topic-item__count', textContent: String(topic.cards.length) });

    const rename = el('button', {
      className: 'icon-btn', type: 'button', title: 'Rename topic', textContent: '✎',
      onclick: () => onRenameTopic(topic),
    });

    const del = el('button', {
      className: 'icon-btn icon-btn--danger', type: 'button', title: 'Delete topic', textContent: '🗑',
      onclick: () => onDeleteTopic(topic),
    });

    const li = el('li', { className: 'topic-item' }, [name, count, rename, del]);
    if (selected) li.setAttribute('aria-current', 'true');
    els.topicList.append(li);
  }
}

function renderCards() {
  const topic = store.selectedTopic;
  els.currentTopic.textContent = topic ? topic.name : '—';
  els.cardFlow.replaceChildren();

  const hasCards = topic && topic.cards.length > 0;
  els.cardsEmpty.hidden = hasCards;
  if (!topic) { els.cardsEmpty.hidden = false; return; }

  topic.cards.forEach((card, index) => {
    els.cardFlow.append(renderCard(topic, card, index));
  });
}

function renderCard(topic, card, index) {
  const handle = el('div', { className: 'card__handle', title: 'Drag to reorder', textContent: '⠿' });
  const title = el('h3', { className: 'card__title', textContent: card.title });

  const edit = el('button', { type: 'button', textContent: 'Edit', onclick: () => openCardDialog(card) });
  const del = el('button', { type: 'button', textContent: 'Delete', onclick: () => onDeleteCard(card) });
  const actions = el('div', { className: 'card__actions' }, [edit, del]);

  const children = [handle, title, actions];

  if (card.notes) children.push(el('p', { className: 'card__notes', textContent: card.notes }));

  const meta = [];
  if (card.links.length) meta.push(el('span', { className: 'chip', textContent: `🔗 ${card.links.length} link${card.links.length > 1 ? 's' : ''}` }));
  if (card.files.length) meta.push(el('span', { className: 'chip', textContent: `📎 ${card.files.length} file${card.files.length > 1 ? 's' : ''}` }));
  if (meta.length) children.push(el('div', { className: 'card__meta' }, meta));

  const searchActive = $('#search').value.trim().length > 0;
  const cardEl = el('article', { className: 'card', draggable: !searchActive }, children);
  cardEl.dataset.index = String(index);
  wireDrag(cardEl, topic);

  return el('li', { className: 'card-flow__item' }, cardEl);
}

/* ------------------------------------------------------- drag & reorder --- */

let dragFromIndex = null;

function wireDrag(cardEl, topic) {
  cardEl.addEventListener('dragstart', (e) => {
    dragFromIndex = Number(cardEl.dataset.index);
    cardEl.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  cardEl.addEventListener('dragend', () => {
    dragFromIndex = null;
    $$('.card').forEach(c => c.classList.remove('dragging', 'drop-target'));
  });

  cardEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (dragFromIndex === null) return;
    cardEl.classList.add('drop-target');
  });

  cardEl.addEventListener('dragleave', () => cardEl.classList.remove('drop-target'));

  cardEl.addEventListener('drop', (e) => {
    e.preventDefault();
    const toIndex = Number(cardEl.dataset.index);
    if (dragFromIndex === null || dragFromIndex === toIndex) return;

    const [moved] = topic.cards.splice(dragFromIndex, 1);
    topic.cards.splice(toIndex, 0, moved);
    render();
    persist(() => DB.updateCardOrder(topic.cards.map(c => c.id)));
  });
}

/* ------------------------------------------------------ topic handlers --- */

const addTopicForm = $('[data-add-topic]');
addTopicForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $('#new-topic-name');
  const name = input.value.trim();
  if (!name) return;
  input.value = '';

  await persist(async () => {
    const topic = await DB.createTopic(name, store.topics.length);
    store.topics.push(topic);
    store.selectedTopicId = topic.id;
    render();
  });
});

function onRenameTopic(topic) {
  const name = prompt('Rename topic', topic.name);
  if (!name || !name.trim()) return;
  const trimmed = name.trim();
  persist(async () => {
    await DB.renameTopic(topic.id, trimmed);
    topic.name = trimmed;
    render();
  });
}

function onDeleteTopic(topic) {
  confirmDialog({
    title: 'Delete topic?',
    message: `“${topic.name}” and its ${topic.cards.length} card(s) will be removed.`,
    onConfirm: () => persist(async () => {
      await DB.deleteTopic(topic.id);
      store.topics = store.topics.filter(t => t.id !== topic.id);
      if (store.selectedTopicId === topic.id) {
        store.selectedTopicId = store.topics[0]?.id || null;
      }
      render();
    }),
  });
}

/* ------------------------------------------------------- card dialog ----- */

const cardDialog = $('[data-card-dialog]');
const cardForm = $('[data-card-form]');
const linkList = $('[data-link-list]');
const fileList = $('[data-file-list]');

let editingCardId = null;      // null => adding
let draftLinks = [];
let draftFiles = [];

$('[data-add-card]').addEventListener('click', () => openCardDialog(null));
$('[data-card-cancel]').addEventListener('click', () => cardDialog.close());

function openCardDialog(card) {
  if (!store.selectedTopic) return;
  editingCardId = card ? card.id : null;
  draftLinks = card ? card.links.map(l => ({ ...l })) : [];
  draftFiles = card ? card.files.map(f => ({ ...f })) : [];

  $('[data-card-dialog-title]').textContent = card ? 'Edit card' : 'Add card';
  cardForm.title.value = card ? card.title : '';
  cardForm.notes.value = card ? card.notes : '';
  renderAttachments();
  cardDialog.showModal();
  cardForm.title.focus();
}

function renderAttachments() {
  linkList.replaceChildren(...draftLinks.map((link, i) => {
    const label = link.label || link.url;
    const a = isSafeUrl(link.url)
      ? el('a', { href: link.url, target: '_blank', rel: 'noreferrer', textContent: label })
      : document.createTextNode(label);
    const remove = el('button', { type: 'button', className: 'icon-btn icon-btn--danger', textContent: '✕',
      onclick: () => { draftLinks.splice(i, 1); renderAttachments(); } });
    return el('li', { className: 'attach-item' }, [el('span', {}, [a]), remove]);
  }));

  fileList.replaceChildren(...draftFiles.map((file, i) => {
    const name = file.url && isSafeUrl(file.url)
      ? el('a', { href: file.url, target: '_blank', rel: 'noreferrer', textContent: `📎 ${file.name}` })
      : document.createTextNode(`📎 ${file.name}`);
    const remove = el('button', { type: 'button', className: 'icon-btn icon-btn--danger', textContent: '✕',
      onclick: () => { draftFiles.splice(i, 1); renderAttachments(); } });
    return el('li', { className: 'attach-item' }, [el('span', {}, [name]), remove]);
  }));
}

$('[data-add-link]').addEventListener('click', () => {
  const urlInput = $('[data-link-url]');
  const labelInput = $('[data-link-label]');
  const url = urlInput.value.trim();
  if (!url) return;
  if (!isSafeUrl(url)) { setStatus('Only http(s) links are allowed', true); return; }
  draftLinks.push({ url, label: labelInput.value.trim() });
  urlInput.value = '';
  labelInput.value = '';
  renderAttachments();
});

$('[data-add-file]').addEventListener('click', async () => {
  const fileInput = $('[data-file-input]');
  const file = fileInput.files[0];
  if (!file) return;
  fileInput.value = '';
  // Upload immediately so we hold a storage path for the draft. If the dialog
  // is cancelled the object is orphaned — acceptable for a personal tool.
  await persist(async () => {
    const uploaded = await DB.uploadFile(file);
    draftFiles.push(uploaded);
    renderAttachments();
  }, 'Uploading…');
});

cardForm.addEventListener('submit', async (e) => {
  const topic = store.selectedTopic;
  const title = cardForm.title.value.trim();
  if (!topic || !title) { e.preventDefault(); return; }

  const data = { title, notes: cardForm.notes.value.trim() };
  const links = draftLinks.map(l => ({ ...l }));
  const files = draftFiles.map(f => ({ ...f }));
  // form method="dialog" closes the dialog; persist after.

  persist(async () => {
    let card;
    if (editingCardId) {
      card = topic.cards.find(c => c.id === editingCardId);
      await DB.updateCard(editingCardId, data);
      Object.assign(card, data);
    } else {
      card = await DB.createCard(topic.id, data, topic.cards.length);
      topic.cards.push(card);
    }
    const saved = await DB.replaceAttachments(card.id, links, files);
    card.links = saved.links;
    card.files = saved.files;
    render();
  });
});

function onDeleteCard(card) {
  confirmDialog({
    title: 'Delete card?',
    message: `“${card.title}” will be removed.`,
    onConfirm: () => persist(async () => {
      await DB.deleteCard(card.id);
      const topic = store.selectedTopic;
      if (topic) topic.cards = topic.cards.filter(c => c.id !== card.id);
      render();
    }),
  });
}

/* ----------------------------------------------------- confirm dialog ---- */

const confirm = {
  dialog: $('[data-confirm-dialog]'),
  title: $('[data-confirm-title]'),
  message: $('[data-confirm-message]'),
  ok: $('[data-confirm-ok]'),
  cancel: $('[data-confirm-cancel]'),
  handler: null,
};

confirm.ok.addEventListener('click', () => {
  confirm.dialog.close();
  confirm.handler?.();
  confirm.handler = null;
});
confirm.cancel.addEventListener('click', () => { confirm.dialog.close(); confirm.handler = null; });

function confirmDialog({ title, message, onConfirm }) {
  confirm.title.textContent = title;
  confirm.message.textContent = message;
  confirm.handler = onConfirm;
  confirm.dialog.showModal();
}

/* ---------------------------------------------------------- search ------- */
// Lightweight filter: hides cards in the current topic that don't match.

$('#search').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  $$('.card-flow__item').forEach((item) => {
    if (!q) { item.hidden = false; return; }
    item.hidden = !item.textContent.toLowerCase().includes(q);
  });
  // Drag reorder relies on dataset.index matching topic.cards positions;
  // a search filter hides cards without re-indexing, so dragging while
  // filtered can reorder the wrong pair. Disable drag until cleared.
  $$('.card').forEach((card) => { card.draggable = !q; });
});

/* ------------------------------------------------------------- boot ------ */

async function reload() {
  const topics = await DB.loadBoard();
  store.topics = topics;
  if (!store.selectedTopic) store.selectedTopicId = topics[0]?.id || null;
  render();
}

(async function boot() {
  render();
  if (!DB.configured) {
    setStatus('Supabase not configured', true);
    els.cardsEmpty.textContent = 'Copy config.example.js to config.js and add your Supabase credentials, then reload.';
    els.cardsEmpty.hidden = false;
    return;
  }
  setStatus('Loading…');
  try {
    await reload();
    setStatus('Synced');
  } catch (err) {
    console.error(err);
    setStatus(err.message || 'Load failed', true);
  }
})();
