-- supabase/migrations/20260602_create_matrices.sql
create table if not exists matrices (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null unique,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table matrices enable row level security;

create policy "matrices_own_read"
  on matrices for select using (auth.uid() = user_id);

create policy "matrices_own_insert"
  on matrices for insert with check (auth.uid() = user_id);

create policy "matrices_own_update"
  on matrices for update using (auth.uid() = user_id);
