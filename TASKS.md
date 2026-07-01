# TASKS

Task breakdown and progress log. Append-only — do not remove or overwrite existing records.

### checklist format
```
TASKS-000: [Task Title]
Status: [ ] completed tasks without issue
	[ ] not complete with encounter blocking point
	[ ] in progress, dependence on other tasks complete
Description: [Task Description]
```

---

TASKS-001: Fix AUDIT-SEC-001 — permissive RLS + public storage bucket
Status: [x] completed tasks without issue
Description: Confirmed with user that Knowledge Board remains single-user/personal scope, so `auth.uid()`-scoped policies are not needed. Documented the accepted risk window directly in `supabase/schema.sql` (permissive `using (true)` RLS policies and public `card-files` bucket), noting it must be revisited if the board ever becomes multi-user.

---

TASKS-002: Fix AUDIT-SEC-002 — unsanitized user-controlled filename in storage object path
Status: [x] completed tasks without issue
Description: Breakdown:
  1. Add `sanitizeFileName()` helper in `prototype/db.js` — strips directory segments (splits on `/` and `\` and keeps the last segment), replaces any character outside `[a-zA-Z0-9._-]` with `_`, and collapses a leading run of dots (e.g. bare `..`) to `_`, falling back to `file` for empty input.
  2. Use `sanitizeFileName(file.name)` when building the storage key in `DB.uploadFile()`, instead of the raw `file.name`; the unsanitized `file.name` is still used for the display label.
  3. Export `sanitizeFileName` from `prototype/db.js` for Node test access alongside `buildBoard`.
  4. Add unit tests in `prototype/db.test.js` covering path-traversal segments (`../../etc/passwd`, `a/b/c.png`, `a\\b\\c.png`), control/unsafe characters (null byte, spaces, parens, `?`), a bare `..` segment, and empty-string fallback.
  5. Ran `node --test db.test.js` — all 9 tests pass (6 pre-existing + 3 new).

---

TASKS-003: Fix AUDIT-SEC-003 — no file upload validation (type/size)
Status: [x] completed tasks without issue
Description: Breakdown:
  1. Decided acceptable scope for a personal knowledge board: common image types (png/jpeg/gif/webp/svg), documents (pdf, txt, md, csv, doc/docx, xls/xlsx), and zip; max size 10 MB.
  2. Added `MAX_FILE_SIZE_BYTES`, `ALLOWED_FILE_TYPES`, and `validateFile(file)` to `prototype/logic.js` (pure, testable, no DOM) — returns `{ ok: true }` or `{ ok: false, reason }`.
  3. Wired `validateFile()` into the file-add handler in `prototype/app.js` (`data-add-file` click handler) — rejects before calling `DB.uploadFile()` and surfaces the reason via `setStatus(..., true)`.
  4. Added `accept` attribute to the file `<input>` in `prototype/index.html` matching the allowlist, as a UX hint (not a security boundary).
  5. Set matching `file_size_limit` (10485760 bytes) and `allowed_mime_types` on the `card-files` Supabase Storage bucket in `supabase/schema.sql`, so the server enforces the same limits as the client.
  6. Added unit tests in `prototype/logic.test.js` covering an allowed type/size, a disallowed MIME type, an oversized file, and a missing file.
  7. Ran `node --test logic.test.js db.test.js` — all 20 tests pass (16 pre-existing + 4 new).

---

TASKS-004: Fix AUDIT-SEC-004 — target="_blank" links missing rel="noopener"
Status: [x] completed tasks without issue
Description: Breakdown:
  1. Searched `prototype/app.js` for all `target: '_blank'` anchors — found two, both in `renderAttachments()` (link attachments and file attachments), each using `rel: 'noreferrer'` only.
  2. Updated both to `rel: 'noopener noreferrer'` so the new tab cannot access `window.opener` (reverse-tabnabbing hardening) while still stripping the referrer.
