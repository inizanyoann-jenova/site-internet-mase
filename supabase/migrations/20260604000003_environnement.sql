-- supabase/migrations/20260604000003_environnement.sql

create table if not exists flux_environnement (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  annee       int not null,
  mois        int not null check (mois between 1 and 12),
  type_flux   text not null check (type_flux in ('energie_kwh','eau_m3','dechets_kg','co2_kg','autre')),
  valeur      numeric(12,2) not null default 0,
  commentaire text,
  created_at  timestamptz default now(),
  unique (company_id, annee, mois, type_flux)
);

create index on flux_environnement (company_id, annee, mois);

alter table flux_environnement enable row level security;

create policy "env_select" on flux_environnement for select using (company_id = get_user_company_id());
create policy "env_insert" on flux_environnement for insert with check (company_id = get_user_company_id());
create policy "env_update" on flux_environnement for update using (company_id = get_user_company_id());
create policy "env_delete" on flux_environnement for delete using (company_id = get_user_company_id());

create table if not exists objectifs_environnement (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  annee         int not null,
  type_flux     text not null,
  cible_annuelle numeric(12,2),
  unique (company_id, annee, type_flux)
);

alter table objectifs_environnement enable row level security;

create policy "obj_env_select" on objectifs_environnement for select using (company_id = get_user_company_id());
create policy "obj_env_insert" on objectifs_environnement for insert with check (company_id = get_user_company_id());
create policy "obj_env_update" on objectifs_environnement for update using (company_id = get_user_company_id());
create policy "obj_env_delete" on objectifs_environnement for delete using (company_id = get_user_company_id());
