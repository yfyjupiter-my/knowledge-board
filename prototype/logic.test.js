'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isSafeUrl, reorderArray, validateFile, MAX_FILE_SIZE_BYTES } = require('./logic.js');

test('isSafeUrl accepts http and https', () => {
  assert.equal(isSafeUrl('http://example.com'), true);
  assert.equal(isSafeUrl('https://example.com/path?x=1'), true);
});

test('isSafeUrl rejects javascript: and other schemes', () => {
  assert.equal(isSafeUrl('javascript:alert(1)'), false);
  assert.equal(isSafeUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(isSafeUrl('file:///etc/passwd'), false);
});

test('isSafeUrl rejects malformed input instead of throwing', () => {
  assert.equal(isSafeUrl('not a url'), false);
  assert.equal(isSafeUrl(''), false);
});

test('reorderArray moves an item forward', () => {
  assert.deepEqual(reorderArray(['a', 'b', 'c', 'd'], 0, 2), ['b', 'c', 'a', 'd']);
});

test('reorderArray moves an item backward', () => {
  assert.deepEqual(reorderArray(['a', 'b', 'c', 'd'], 3, 1), ['a', 'd', 'b', 'c']);
});

test('reorderArray does not mutate the input array', () => {
  const original = ['a', 'b', 'c'];
  reorderArray(original, 0, 2);
  assert.deepEqual(original, ['a', 'b', 'c']);
});

test('reorderArray is a no-op when from and to are the same index', () => {
  assert.deepEqual(reorderArray(['a', 'b', 'c'], 1, 1), ['a', 'b', 'c']);
});

test('validateFile accepts an allowed type within the size limit', () => {
  const file = { type: 'image/png', size: 1024 };
  assert.deepEqual(validateFile(file), { ok: true });
});

test('validateFile rejects a disallowed MIME type', () => {
  const file = { type: 'application/x-msdownload', size: 1024 };
  const result = validateFile(file);
  assert.equal(result.ok, false);
  assert.match(result.reason, /Unsupported file type/);
});

test('validateFile rejects a file over the size limit', () => {
  const file = { type: 'image/png', size: MAX_FILE_SIZE_BYTES + 1 };
  const result = validateFile(file);
  assert.equal(result.ok, false);
  assert.match(result.reason, /too large/);
});

test('validateFile rejects when no file is given', () => {
  const result = validateFile(null);
  assert.equal(result.ok, false);
  assert.match(result.reason, /No file selected/);
});
