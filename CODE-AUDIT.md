# Code & Architecture Audit

Scope: `prototype/` (app.js, db.js, index.html, styles.css), `supabase/schema.sql`.
Date: 2026-07-01. Snapshot at commit `ae88a41`.

Overall: small, single-user vanilla JS + Supabase prototype. No build step, no
tests, no framework — appropriate for its stated scope. Findings below are
ordered by priority; each has a required action.

## P1 — Fixed

1. ~~**Save/load failures are now silent.**~~ **Fixed.** Restored the navbar
   status pill (`index.html` `[data-status]`, styled in `styles.css`) and
   `setStatus()`/`persist()`/`boot()` plumbing in `app.js` so `"Sync failed"` /
   `"Load failed"` surface to the user again, matching pre-`ae88a41` behavior.
   This also gave the `pending` label passed at `app.js` (file upload call
   site) a real purpose again, resolving P2 item 3 below as a side effect.

2. ~~**Stale doc comment references removed UI.**~~ **Fixed.** `db.js:3`
   comment now describes the restored status-pill error surface.

## P2 — Should fix

3. ~~**Dead parameter at a `persist()` call site.**~~ **Resolved by the P1 fix
   above** — `persist(action, pending)` now accepts and displays the pending
   label again, so `app.js:276`'s `'Uploading…'` argument is live.

4. ~~**Drag reorder can desync under an active search filter.**~~ **Fixed.**
   `wireDrag()` (app.js:131) reads `cardEl.dataset.index`, which is assigned
   from `topic.cards` positions at render time. The search handler
   (app.js:347) hides non-matching cards via `item.hidden` without
   re-indexing. Dragging a card while a filter is active could reorder the
   wrong pair of cards relative to what's visible.
   Resolved by disabling drag while a search filter is active: the search
   input handler now toggles `card.draggable` on all `.card` elements based
   on whether the query is non-empty (`app.js` search handler), and
   `renderCard()` checks the current search value at render time so newly
   rendered cards (e.g. after adding a card while filtered) also start with
   drag correctly disabled.

5. ~~**Attachment links accept any URL scheme, including `javascript:`.**~~
   **Fixed.** `renderAttachments()` (app.js:236-242) built `<a href="{url}">`
   directly from user-entered link URLs with no scheme allowlist, so a
   stored `javascript:` URL would execute on click.
   Resolved via a shared `isSafeUrl()` helper (app.js, near `el()`) that
   allows only `http:`/`https:`. The add-link handler now rejects unsafe
   URLs with a status message instead of storing them, and
   `renderAttachments()` defensively falls back to plain text (no `<a>`) for
   any link or file URL that fails the check, covering rows that may already
   exist from before this fix or from direct DB edits.

6. ~~**`updateCardOrder` has no atomicity.**~~ **Fixed.**
   `db.js:109-115` fired one `UPDATE` per card via `Promise.all`. If one
   request failed, the others were already in flight and not rolled back,
   leaving `sort_order` partially applied until the subsequent `reload()`
   masked it.
   Resolved by adding a `reorder_cards(card_ids uuid[])` Postgres function
   (`supabase/schema.sql`) that updates all rows in one statement/transaction,
   and switching `DB.updateCardOrder()` (db.js) to call it via
   `client.rpc('reorder_cards', ...)` instead of firing per-card updates.
   Note: existing Supabase projects need to re-run `schema.sql` (or just the
   new function block) to pick up the RPC.

## P3 — Housekeeping

7. **Untracked `styling-playground/` directory.**
   Sitting in the working tree unversioned (`git status` shows `??`).
   Unclear if it's an in-progress theme experiment or scratch work.
   **Action:** either commit it, move it out of the repo, or add it to
   `.gitignore` — resolve before it's lost or accidentally swept into an
   unrelated commit.

8. **No automated tests.**
   `app.js`/`db.js` contain real logic worth protecting (attachment
   merge/replace, sort-order reindexing, board reconstruction from flat
   Supabase rows in `loadBoard()`). None of it is covered.
   **Action:** if this prototype moves past personal use, add at least unit
   coverage for `DB.loadBoard()`'s row→tree reconstruction and the
   drag-reorder index math — the two places with the most non-obvious logic.

## Acknowledged, no action needed

- **RLS policies are fully permissive (`using (true)`).** Documented and
  intentional in `supabase/schema.sql:1-6` for a private single-user tool;
  flagged there already as needing tightening if this becomes multi-user.
- **Deleted storage objects aren't cleaned up on card/topic delete.**
  Documented in `db.js:84-85` as accepted scope for a personal tool.
- **Global coupling (`DB`, `store`, `els` as module-level singletons).**
  Reasonable for the current single-page, no-build-step scale; revisit only
  if the app grows additional views/routes.
