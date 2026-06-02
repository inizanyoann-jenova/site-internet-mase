create table if not exists purchases (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users not null,
  stripe_session_id text unique not null,
  amount_cents      int not null,
  created_at        timestamptz default now()
);

alter table purchases enable row level security;

create policy "Lecture par propriétaire"
  on purchases for select
  using (auth.uid() = user_id);
