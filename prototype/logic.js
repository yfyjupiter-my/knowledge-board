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

// Node-only export for logic.test.js. Browsers load this file via a plain
// <script> tag, where `module` is undefined and this block is a no-op.
if (typeof module !== 'undefined') module.exports = { isSafeUrl, reorderArray };
