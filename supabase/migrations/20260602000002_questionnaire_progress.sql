create table if not exists questionnaire_progress (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users unique not null,
  answers    jsonb not null,
  updated_at timestamptz default now()
);

alter table questionnaire_progress enable row level security;

create policy "CRUD par propriétaire"
  on questionnaire_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
