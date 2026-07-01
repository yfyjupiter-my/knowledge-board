// Knowledge Board — Supabase data layer.
// Wraps the Supabase JS client. All functions are async and throw on error;
// callers (app.js) surface failures via the navbar status pill and log to
// console. The rest of the app keeps a local cache and calls these for
// write-through persistence.

'use strict';

// Turn flat topics/cards/attachments rows into the nested tree app.js
// renders. Pure and DB-client-free so it can be unit tested directly —
// see db.test.js.
function buildBoard(topics, cards, attachments, publicUrl) {
  const byCard = new Map();
  for (const a of attachments) {
    if (!byCard.has(a.card_id)) byCard.set(a.card_id, { links: [], files: [] });
    const bucketed = byCard.get(a.card_id);
    if (a.type === 'link') {
      bucketed.links.push({ id: a.id, url: a.url_or_path, label: a.label || '' });
    } else {
      bucketed.files.push({ id: a.id, path: a.url_or_path, name: a.label || 'file', url: publicUrl(a.url_or_path) });
    }
  }

  const cardsByTopic = new Map();
  for (const c of cards) {
    const att = byCard.get(c.id) || { links: [], files: [] };
    const card = { id: c.id, title: c.title, notes: c.notes || '', links: att.links, files: att.files };
    if (!cardsByTopic.has(c.topic_id)) cardsByTopic.set(c.topic_id, []);
    cardsByTopic.get(c.topic_id).push(card);
  }

  return topics.map(t => ({ id: t.id, name: t.name, cards: cardsByTopic.get(t.id) || [] }));
}

// Guarded for Node (db.test.js), where there is no `window` global.
const DB = typeof window === 'undefined' ? null : (() => {
  const cfg = window.SUPABASE_CONFIG;
  const configured =
    cfg && cfg.url && cfg.anonKey &&
    !cfg.url.includes('YOUR-PROJECT') && !cfg.anonKey.includes('YOUR-ANON');

  if (!configured) {
    // Every method rejects with the same helpful message until config.js is set.
    const notConfigured = () => Promise.reject(
      new Error('Supabase not configured — copy config.example.js to config.js and add your project URL + anon key.')
    );
    return new Proxy({ configured: false }, {
      get: (target, prop) => (prop in target ? target[prop] : notConfigured),
    });
  }

  const client = window.supabase.createClient(cfg.url, cfg.anonKey);
  const bucket = cfg.bucket || 'card-files';

  // Turn a card_attachments row into the shape app.js renders.
  const publicUrl = (path) => client.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  return {
    configured: true,

    // ------------------------------------------------------------- read ---
    // Load the whole board: topics → cards → attachments, all ordered.
    async loadBoard() {
      const { data: topics, error: tErr } = await client
        .from('topics').select('*').order('sort_order');
      if (tErr) throw tErr;

      const { data: cards, error: cErr } = await client
        .from('cards').select('*').order('sort_order');
      if (cErr) throw cErr;

      const { data: attachments, error: aErr } = await client
        .from('card_attachments').select('*').order('created_at');
      if (aErr) throw aErr;

      return buildBoard(topics, cards, attachments, publicUrl);
    },

    // ------------------------------------------------------- topics -------
    async createTopic(name, sortOrder) {
      const { data, error } = await client
        .from('topics').insert({ name, sort_order: sortOrder }).select().single();
      if (error) throw error;
      return { id: data.id, name: data.name, cards: [] };
    },

    async renameTopic(id, name) {
      const { error } = await client.from('topics').update({ name }).eq('id', id);
      if (error) throw error;
    },

    async deleteTopic(id) {
      // Cards + attachments cascade in Postgres. Storage objects are not
      // cascaded; a periodic cleanup could prune orphans (out of scope here).
      const { error } = await client.from('topics').delete().eq('id', id);
      if (error) throw error;
    },

    // -------------------------------------------------------- cards -------
    async createCard(topicId, { title, notes }, sortOrder) {
      const { data, error } = await client
        .from('cards').insert({ topic_id: topicId, title, notes, sort_order: sortOrder }).select().single();
      if (error) throw error;
      return { id: data.id, title: data.title, notes: data.notes || '', links: [], files: [] };
    },

    async updateCard(id, { title, notes }) {
      const { error } = await client.from('cards').update({ title, notes }).eq('id', id);
      if (error) throw error;
    },

    async deleteCard(id) {
      const { error } = await client.from('cards').delete().eq('id', id);
      if (error) throw error;
    },

    // Persist new order: write each card's sort_order to its array index.
    // Runs as a single transaction via the reorder_cards RPC (schema.sql) so
    // a mid-write failure can't leave sort_order partially applied.
    async updateCardOrder(orderedCardIds) {
      const { error } = await client.rpc('reorder_cards', { card_ids: orderedCardIds });
      if (error) throw error;
    },

    // --------------------------------------------------- attachments ------
    // Replace all attachments for a card with the given drafts.
    // Simple + correct for a single user; diffing is a future optimization.
    async replaceAttachments(cardId, links, files) {
      const { error: delErr } = await client.from('card_attachments').delete().eq('card_id', cardId);
      if (delErr) throw delErr;

      const rows = [
        ...links.map(l => ({ card_id: cardId, type: 'link', url_or_path: l.url, label: l.label || null })),
        ...files.map(f => ({ card_id: cardId, type: 'file', url_or_path: f.path, label: f.name })),
      ];
      if (rows.length === 0) return { links: [], files: [] };

      const { data, error } = await client.from('card_attachments').insert(rows).select();
      if (error) throw error;

      const result = { links: [], files: [] };
      for (const a of data) {
        if (a.type === 'link') result.links.push({ id: a.id, url: a.url_or_path, label: a.label || '' });
        else result.files.push({ id: a.id, path: a.url_or_path, name: a.label || 'file', url: publicUrl(a.url_or_path) });
      }
      return result;
    },

    // Upload a File to storage; returns the draft shape used by the dialog.
    async uploadFile(file) {
      // Prefix with a counter-free unique-ish path. crypto.randomUUID keeps
      // names collision-safe without Math.random.
      const path = `${crypto.randomUUID()}-${file.name}`;
      const { error } = await client.storage.from(bucket).upload(path, file);
      if (error) throw error;
      return { path, name: file.name, url: publicUrl(path) };
    },
  };
})();

// Node-only export for db.test.js. Browsers load this file via a plain
// <script> tag, where `module` is undefined and this block is a no-op.
if (typeof module !== 'undefined') module.exports = { buildBoard };
