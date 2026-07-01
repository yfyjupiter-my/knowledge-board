'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildBoard, sanitizeFileName } = require('./db.js');

const publicUrl = (path) => `https://cdn.example/${path}`;

test('buildBoard nests cards under their topic, preserving order', () => {
  const topics = [{ id: 't1', name: 'Topic 1' }, { id: 't2', name: 'Topic 2' }];
  const cards = [
    { id: 'c1', topic_id: 't1', title: 'First', notes: '' },
    { id: 'c2', topic_id: 't1', title: 'Second', notes: '' },
    { id: 'c3', topic_id: 't2', title: 'Only', notes: '' },
  ];
  const board = buildBoard(topics, cards, [], publicUrl);

  assert.equal(board.length, 2);
  assert.deepEqual(board[0].cards.map(c => c.id), ['c1', 'c2']);
  assert.deepEqual(board[1].cards.map(c => c.id), ['c3']);
});

test('buildBoard gives topics with no cards an empty array', () => {
  const topics = [{ id: 't1', name: 'Empty topic' }];
  const board = buildBoard(topics, [], [], publicUrl);
  assert.deepEqual(board[0].cards, []);
});

test('buildBoard defaults a null notes column to an empty string', () => {
  const topics = [{ id: 't1', name: 'Topic 1' }];
  const cards = [{ id: 'c1', topic_id: 't1', title: 'Card', notes: null }];
  const board = buildBoard(topics, cards, [], publicUrl);
  assert.equal(board[0].cards[0].notes, '');
});

test('buildBoard splits attachments into links and files, and resolves file public URLs', () => {
  const topics = [{ id: 't1', name: 'Topic 1' }];
  const cards = [{ id: 'c1', topic_id: 't1', title: 'Card', notes: '' }];
  const attachments = [
    { id: 'a1', card_id: 'c1', type: 'link', url_or_path: 'https://a.example', label: 'A link' },
    { id: 'a2', card_id: 'c1', type: 'file', url_or_path: 'uploads/x.png', label: 'x.png' },
  ];
  const board = buildBoard(topics, cards, attachments, publicUrl);
  const [card] = board[0].cards;

  assert.deepEqual(card.links, [{ id: 'a1', url: 'https://a.example', label: 'A link' }]);
  assert.deepEqual(card.files, [{ id: 'a2', path: 'uploads/x.png', name: 'x.png', url: 'https://cdn.example/uploads/x.png' }]);
});

test('buildBoard falls back to an empty label and a default file name', () => {
  const topics = [{ id: 't1', name: 'Topic 1' }];
  const cards = [{ id: 'c1', topic_id: 't1', title: 'Card', notes: '' }];
  const attachments = [
    { id: 'a1', card_id: 'c1', type: 'link', url_or_path: 'https://a.example', label: null },
    { id: 'a2', card_id: 'c1', type: 'file', url_or_path: 'uploads/x.png', label: null },
  ];
  const board = buildBoard(topics, cards, attachments, publicUrl);
  const [card] = board[0].cards;

  assert.equal(card.links[0].label, '');
  assert.equal(card.files[0].name, 'file');
});

test('buildBoard ignores attachments belonging to a card that no longer exists', () => {
  const topics = [{ id: 't1', name: 'Topic 1' }];
  const cards = [{ id: 'c1', topic_id: 't1', title: 'Card', notes: '' }];
  const attachments = [
    { id: 'a1', card_id: 'orphaned', type: 'link', url_or_path: 'https://a.example', label: null },
  ];
  const board = buildBoard(topics, cards, attachments, publicUrl);
  assert.deepEqual(board[0].cards[0].links, []);
});

test('sanitizeFileName strips directory segments from path-separated names', () => {
  assert.equal(sanitizeFileName('../../etc/passwd'), 'passwd');
  assert.equal(sanitizeFileName('a/b/c.png'), 'c.png');
  assert.equal(sanitizeFileName('a\\b\\c.png'), 'c.png');
});

test('sanitizeFileName replaces unsafe and control characters', () => {
  assert.equal(sanitizeFileName('report\x00.txt'), 'report_.txt');
  assert.equal(sanitizeFileName('my file (final)?.docx'), 'my_file__final__.docx');
});

test('sanitizeFileName neutralizes a bare traversal segment and falls back for empty input', () => {
  assert.equal(sanitizeFileName('..'), '_');
  assert.equal(sanitizeFileName(''), 'file');
});
