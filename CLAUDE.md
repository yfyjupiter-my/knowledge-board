# Knowledge Board

A personal knowledge board for self-study: key learnings captured as movable, reorderable cards grouped into linear ordered lists per topic. Built with plain HTML/CSS/vanilla JS, backed by Supabase.

## Agent skills

### Issue tracker

Issues and PRDs are tracked as local markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default triage vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Core Files:

1. STATUS.md
2. TASKS.md
3. SECURITY-AUDIT.md
4. CODE-AUDIT.md
5. RUNTIME-AUDIT.md
6. LOGIC-AUDIT.md
7. ERROR-AUDIT.md
8. COMPLIANCE-AUDIT.md

---

### Files Descriptions

- **TASKS.md**: to record break down task with tasks description and progress status. **Do not remove or overwrite old record** just only can append new record 
- **STATUS.md**: to record task encounter blocking point, format must contain **progress status**, **task title**, **task description**
- **SECURITY-AUDIT.md**: to records "Security Vulnerabilities check" breakdown required actions subtasks
- **CODE-AUDIT.md**: to record "Code Quality and Architectural Flaws check" breakdown required actions subtasks 
- **RUNTIME-AUDIT.md**: to record "Runtime and Performance Leaks check" breakdown required actions subtasks 
- **LOGIC-AUDIT.md**: to record "Business logic and State Vulnerabilities check" breakdown required actions subtasks 
- **ERROR-AUDIT.md**: to record "Robustness and Error Handling check" breakdown required actions subtasks 
- **COMPLIANCE-AUDIT.md**: to record "Compliance and Accessibility check" breakdown required actions subtasks 

---

### Audit File Standard Format

```
## [xx-AUDIT.md]

### Description

### Workflow Rules
- breakdown required actions to smaller subtasks
- **Do not remove or overwrite** existing contents and records, just only append

### checklist format
"""
AUDIT-xxx-000: [Audit Title]
Status: [ ]
required action: [ breakdown subtasks ]
"""

### restrictions
- **Do not fix all tasks / subtasks in one shot**, only 1 task per conversation
- **Do not record check results**

```

---

### Workflow Rules
- When start new conversation, must read **CLAUDE.md**, **STATUS.md**, **TASKS.md**
- When user say "start new tasks xxxx" or "go new tasks xxx", breakdown the tasks into smaller, managaeable subtaks and save them in a file named **TASKS.md**
- When a tasks completed, but exclude when trigger from:
	- "* security check"
	- "* code and architecture check"
	- "* runtime and performance check"
	- "* logic and state check"
	- "* robustness and error handling check"
	- "* compliance and accessibility check"
	
  must update to **TASKS.md** using following checklist format:
	TASKS-000: [Task Title]
	Status: [ ] completed tasks without issue
		[ ] not complete with encounter blocking point
		[ ] in progress, dependence on other tasks complete
	Description: [Task Description]

- When the task encounter blocking point, must record the root cause into a file called **STATUS.md**
- When the task in progress, needs waiting other dependence task complete, must record the statement into a file called **STATUS.md**

- When new conversation trigger 
	--> "perform security vulnerabilities check", read **SECURITY-AUDIT.md** first.
	--> "perform code and architecture check", read **CODE-AUDIT.md** first.
	--> "perform runtime and performance check", read **RUNTIME-AUDIT.md** first.
	--> "perform logic and state check", read **LOGIC-AUDIT.md** first.
	--> "perform robustness and error handling check", read **ERROR-AUDIT.md** first.
	--> "perform compliance and accessibility check", read **COMPLIANCE-AUDIT.md** first.

---

### Wireframing
When asked to create a wireframe or layout draft, output structure only:
- Plain semantic HTML or JSX
- No CSS, no Tailwind, no styled-components, no inline styles
- Use bordered placeholder boxes or text labels for content blocks
- Do not suggest colors, fonts, or spacing
Styling is a separate, explicit follow-up step.

---

### Restriction
- **Do not remove or overwrite** TASKS.md, STATUS.md, SECURITY-AUDIT.md, CODE-AUDIT.md, RUNTIME-AUDIT.md, LOGIC-AUDIT.md, ERROR-AUDIT.md, COMPLIANCE-AUDIT.md existing contents and records, just only append
- **Unnecessary summary table** in TASKS.md, STATUS.md, SECURITY-AUDIT.md, CODE-AUDIT.md, RUNTIME-AUDIT.md, LOGIC-AUDIT.md, ERROR-AUDIT.md, COMPLIANCE-AUDIT.md
- tasks number should be ascending, do not **repeat or duplicate same number**
- **All .md files tasks status** status transition by ✅ successful - 🚫 failed - ⏸️ in progress
- **XXX-AUDTI.md** template must consistent to ### Audit File Standard Format

---

