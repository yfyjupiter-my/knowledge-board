// Knowledge Board — pure logic shared by app.js and the test suite.
// No DOM, no Supabase — safe to load in the browser (plain <script>, before
// app.js) or require() directly from Node for unit tests (logic.test.js).

'use strict';

// Only http(s) links are ever rendered as clickable — blocks javascript:
// and other schemes from executing if stored (e.g. via direct DB edits).
function isSafeUrl(url) {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

// Move the item at fromIndex to toIndex, returning a new array.
function reorderArray(arr, fromIndex, toIndex) {
  const next = arr.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

// Attachment scope for a personal knowledge board: common images and
// documents. Anything else is rejected client-side before it reaches
// DB.uploadFile(); mirror this list in the Supabase bucket's
// allowed_mime_types so the server side enforces it too.
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_FILE_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'text/plain', 'text/markdown', 'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
]);

// Validate a File before upload. Returns { ok: true } or { ok: false, reason }
// so callers can surface a specific status message.
function validateFile(file) {
  if (!file) return { ok: false, reason: 'No file selected' };
  if (file.size > MAX_FILE_SIZE_BYTES) return { ok: false, reason: 'File too large (max 10 MB)' };
  if (!ALLOWED_FILE_TYPES.has(file.type)) return { ok: false, reason: 'Unsupported file type' };
  return { ok: true };
}

// Node-only export for logic.test.js. Browsers load this file via a plain
// <script> tag, where `module` is undefined and this block is a no-op.
if (typeof module !== 'undefined') {
  module.exports = { isSafeUrl, reorderArray, validateFile, MAX_FILE_SIZE_BYTES, ALLOWED_FILE_TYPES };
}
