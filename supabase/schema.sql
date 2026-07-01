-- Knowledge Board — Supabase schema
-- Run this in the Supabase SQL editor (or `supabase db` migration) once per project.
-- Single-user personal tool: RLS is enabled with permissive anon policies.
-- NOTE: with the anon key shipped client-side, anyone with the key has full
-- access. That is acceptable for a private personal board; add Supabase Auth
-- and tighten the policies to `auth.uid()` if this ever becomes multi-user.
--
-- ACCEPTED RISK (reviewed 2026-07-01): scope confirmed single-user/personal.
-- Permissive `using (true)` policies and the public `card-files` bucket are
-- an accepted risk for as long as this stays single-user. Revisit this
-- decision — and add Supabase Auth scoped to `auth.uid()` — the moment the
-- board is shared with more than one person.

-- ---------------------------------------------------------------- tables ---

create table if not exists public.topics (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.cards (
  id          uuid primary key default gen_random_uuid(),
  topic_id    uuid not null references public.topics(id) on delete cascade,
  title       text not null,
  notes       text not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.card_attachments (
  id          uuid primary key default gen_random_uuid(),
  card_id     uuid not null references public.cards(id) on delete cascade,
  type        text not null check (type in ('link', 'file')),
  url_or_path text not null,          -- link: URL; file: storage object path
  label       text,                   -- link: optional label; file: filename
  created_at  timestamptz not null default now()
);

create index if not exists cards_topic_id_idx      on public.cards(topic_id);
create index if not exists attachments_card_id_idx on public.card_attachments(card_id);

-- ------------------------------------------------------- updated_at trigger -

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cards_set_updated_at on public.cards;
create trigger cards_set_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------- reorder cards RPC -
-- Atomically write sort_order for a whole topic's cards in one transaction,
-- so a mid-drag failure can't leave sort_order partially applied.
create or replace function public.reorder_cards(card_ids uuid[])
returns void language plpgsql as $$
begin
  update public.cards as c
  set sort_order = ord.i - 1
  from unnest(card_ids) with ordinality as ord(id, i)
  where c.id = ord.id;
end;
$$;

-- --------------------------------------------------------------------- RLS -

alter table public.topics           enable row level security;
alter table public.cards            enable row level security;
alter table public.card_attachments enable row level security;

-- Permissive single-user policies (anon key). Replace `true` with an
-- `auth.uid()` check if you add authentication later.
drop policy if exists topics_all      on public.topics;
drop policy if exists cards_all       on public.cards;
drop policy if exists attachments_all on public.card_attachments;

create policy topics_all      on public.topics           for all using (true) with check (true);
create policy cards_all       on public.cards            for all using (true) with check (true);
create policy attachments_all on public.card_attachments for all using (true) with check (true);

-- ----------------------------------------------------------------- storage -
-- Create a public bucket for card file attachments. Size/type limits mirror
-- MAX_FILE_SIZE_BYTES / ALLOWED_FILE_TYPES in prototype/logic.js — the
-- client-side check is UX, this is the enforced boundary.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-files', 'card-files', true, 10485760,
  array[
    'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'text/plain', 'text/markdown', 'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip'
  ]
)
on conflict (id) do update set
  file_size_limit     = excluded.file_size_limit,
  allowed_mime_types   = excluded.allowed_mime_types;

-- Allow anon full access to the bucket (single-user).
drop policy if exists card_files_all on storage.objects;
create policy card_files_all on storage.objects
  for all using (bucket_id = 'card-files') with check (bucket_id = 'card-files');
