-- supabase/migrations/20260605_procedure_docs.sql
-- Table procedure_docs pour le générateur de procédures MASE

create table if not exists procedure_docs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  reference text not null default '',
  version text not null default 'V1.0',
  document_date date,
  direction text not null default '',
  responsible text not null default '',
  status text not null default 'brouillon',
  process_parent text not null default '',
  map_id uuid references process_maps(id),
  objective text not null default '',
  domain text not null default '',
  docs_in text not null default '',
  docs_out text not null default '',
  kpi text not null default '',
  steps jsonb not null default '[]',
  risks jsonb not null default '[]',
  approvers jsonb not null default '[]',
  revisions jsonb not null default '[]',
  revision_frequency text,
  phase_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table procedure_docs enable row level security;

create policy "Users manage own procedure_docs"
  on procedure_docs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
