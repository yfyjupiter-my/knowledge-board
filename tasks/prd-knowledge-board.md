# PRD: Knowledge Board

## Introduction

A personal knowledge board for self-study, where key learnings are captured as movable cards. Cards are organized into **linear ordered lists per topic** — within a topic, cards represent steps in a process/learning sequence and can be reordered by dragging. The app is a lightweight, client-side web tool (HTML/CSS/vanilla JS) backed by Supabase for data storage, so the board is accessible and persistent without maintaining local infrastructure.

## Goals

- Let the user capture study notes as structured, reorderable cards grouped by topic
- Represent learning/process flow visually through card ordering within a topic
- Allow attaching supporting links/files to reinforce each knowledge card
- Keep the app simple to run (no build step) and fast to use for daily study capture
- Persist data reliably in Supabase so it isn't lost and can be accessed across sessions/devices

## User Stories

### US-001: Set up Supabase backend
**Description:** As a developer, I need a Supabase project with the right schema so the app has somewhere to store topics and cards.

**Acceptance Criteria:**
- [ ] Supabase project created with `topics` table (id, name, created_at, sort_order)
- [ ] `cards` table created (id, topic_id FK, title, notes, sort_order, created_at, updated_at)
- [ ] `card_attachments` table created (id, card_id FK, type ['link'|'file'], url_or_path, label)
- [ ] Row-level security configured appropriately for single-user access (e.g. simple API key or auth)
- [ ] Supabase JS client integrated in the vanilla JS app (via CDN or bundler-free import)

### US-002: Create and list topics
**Description:** As a user, I want to create topics so I can group related knowledge cards together.

**Acceptance Criteria:**
- [ ] User can create a new topic with a name
- [ ] Topics are listed on the main page (e.g. sidebar or tabs)
- [ ] User can rename a topic
- [ ] User can delete a topic (with confirmation, cascades to its cards)
- [ ] Typecheck/lint (if configured) passes
- [ ] Verify in browser using dev-browser skill

### US-003: Add a knowledge card to a topic
**Description:** As a user, I want to add a card with a title and notes so I can capture a piece of knowledge.

**Acceptance Criteria:**
- [ ] "Add card" control available within a topic view
- [ ] Card requires a title; notes field is optional free text
- [ ] New card is appended to the end of the topic's ordered list
- [ ] Card is saved to Supabase and appears immediately in the UI
- [ ] Verify in browser using dev-browser skill

### US-004: Edit and delete a card
**Description:** As a user, I want to edit or remove a card so I can keep my notes accurate and current.

**Acceptance Criteria:**
- [ ] Clicking a card opens an edit view/modal with title and notes editable
- [ ] Changes save to Supabase (on save action or auto-save)
- [ ] User can delete a card with confirmation
- [ ] Deleting a card does not break the ordering of remaining cards
- [ ] Verify in browser using dev-browser skill

### US-005: Reorder cards within a topic
**Description:** As a user, I want to drag and reorder cards within a topic so the sequence reflects my learning/process flow.

**Acceptance Criteria:**
- [ ] Cards within a topic can be reordered via drag-and-drop
- [ ] New order is persisted to Supabase (`sort_order` updated for affected cards)
- [ ] Order is preserved after page reload
- [ ] Verify in browser using dev-browser skill

### US-006: Attach links or files to a card
**Description:** As a user, I want to attach reference links or files to a card so I can keep supporting material alongside my notes.

**Acceptance Criteria:**
- [ ] User can add one or more URL links to a card, each with an optional label
- [ ] User can attach a file (e.g. PDF, image) to a card, stored via Supabase Storage
- [ ] Attachments are listed on the card and clickable/openable
- [ ] User can remove an attachment
- [ ] Verify in browser using dev-browser skill

### US-007: View a topic as an ordered flow
**Description:** As a user, I want to view a topic's cards in their set order so I can read through the process/learning sequence top to bottom.

**Acceptance Criteria:**
- [ ] Selecting a topic displays its cards in `sort_order`
- [ ] Each card shows title, a notes preview, and attachment indicators
- [ ] Visual indicator (e.g. connecting line or step number) communicates the sequence/flow
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: The system must allow creating, renaming, and deleting topics.
- FR-2: The system must allow creating, editing, and deleting cards within a topic.
- FR-3: Each card must have a title (required) and notes (optional, plain/rich text).
- FR-4: The system must support attaching links and files to a card.
- FR-5: Cards within a topic must be reorderable via drag-and-drop, with the new order persisted.
- FR-6: All data (topics, cards, attachments) must be stored in Supabase (Postgres + Storage) and survive page reloads/browser restarts.
- FR-7: The app must be built with plain HTML, CSS, and vanilla JavaScript, requiring no build step to run locally.
- FR-8: Files attached to cards must be uploaded to Supabase Storage and referenced by URL in `card_attachments`.
- FR-9: The app must load and display existing topics/cards from Supabase on page load.

## Non-Goals (Out of Scope)

- No multi-user support, sharing, or collaboration features in v1
- No free-form canvas/whiteboard mode (only linear ordered lists per topic)
- No rich WYSIWYG editor beyond basic formatted text (e.g. no embedded video, no complex markdown rendering) in v1
- No offline mode / local-only fallback — Supabase connectivity is required
- No mobile app (responsive web only)
- No cross-topic card linking or dependency graphs in v1

## Design Considerations

- Simple, clean single-page layout: topic list/sidebar on one side, ordered card list on the main area
- Cards visually indicate sequence order (numbered or connected with a line/arrow) to reinforce the "process flow" feel
- Minimal, distraction-free styling appropriate for a personal study tool

## Technical Considerations

- Use the Supabase JS client library (via CDN script tag to avoid requiring a build step, consistent with the vanilla JS stack)
- Store Supabase URL/anon key in a config file; since this runs client-side, apply Row Level Security policies scoped to the user (or a simple shared-secret pattern given it's single-user)
- Use Supabase Storage bucket for file attachments; store only the returned public/signed URL in `card_attachments`
- Drag-and-drop reordering can use the native HTML5 Drag and Drop API to avoid extra dependencies
- Debounce/batch `sort_order` updates on drag-drop to minimize write calls

## Success Metrics

- User can go from opening the app to capturing a new knowledge card in under 30 seconds
- Reordering a card and reloading the page shows the persisted order correctly 100% of the time
- Zero data loss across sessions (cards/topics created always reappear on reload)

## Open Questions

- Should there be an auth step (even simple), or is a single shared anon key acceptable given this is a personal tool?
- Should notes support markdown rendering, or is plain text sufficient for v1?
- Is there a need for search/filter across topics and cards as the number of entries grows?
- Should there be a card "status" (e.g. not started / in progress / mastered) in addition to ordering?
