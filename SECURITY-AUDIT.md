## SECURITY-AUDIT.md

### Description
Security Vulnerabilities check.

### Workflow Rules
- breakdown required actions to smaller subtasks
- **Do not remove or overwrite** existing contents and records, just only append

### checklist format
```
AUDIT-SEC-000: [Audit Title]
Status: [ ]
required action: [ breakdown subtasks ]
```

### restrictions
- **Do not fix all tasks / subtasks in one shot**, only 1 task per conversation
- **Do not record check results**

---

AUDIT-SEC-001: Fully permissive RLS policies + public storage bucket
Status: ✅
required action: [
  - Confirm this remains single-user/personal scope; if not, stop and design auth first
  - Add Supabase Auth and scope `topics`/`cards`/`card_attachments` policies to `auth.uid()` instead of `using (true)`
  - Scope the `card-files` storage bucket policy to the authenticated owner instead of full anon access
  - Document the accepted risk window until auth is added
]

---

AUDIT-SEC-002: Unsanitized user-controlled filename in storage object path
Status: ✅
required action: [
  - Review `DB.uploadFile()` (prototype/db.js) — path is `${crypto.randomUUID()}-${file.name}` with no sanitization of `file.name`
  - Strip/escape path-separator and control characters from `file.name` before building the storage key
  - Add a unit test covering filenames containing `/`, `..`, and other unsafe characters
]

---

AUDIT-SEC-003: No file upload validation (type/size)
Status: ✅
required action: [
  - Review `DB.uploadFile()` (prototype/db.js) and the file input handler (prototype/app.js) — no MIME-type allowlist, no size cap
  - Decide acceptable file types and a max size for this tool's scope
  - Enforce the check client-side before upload, and note whether Supabase Storage bucket-level limits should also be set
]

---

AUDIT-SEC-004: target="_blank" links missing rel="noopener"
Status: ✅
required action: [
  - Review `renderAttachments()` (prototype/app.js) — link/file attachment `<a>` tags use `rel="noreferrer"` only
  - Add `noopener` alongside `noreferrer` on all `target="_blank"` anchors as standard reverse-tabnabbing hardening
]

---
