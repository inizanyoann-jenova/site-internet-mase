-- supabase/migrations/20260604000006_calendrier_qhse.sql

create table if not exists calendrier_qhse (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  titre        text not null,
  type_evenement text not null default 'Autre'
    check (type_evenement in ('Audit','Formation','Réunion','Échéance','Visite','Exercice','Autre')),
  date_debut   date not null,
  date_fin     date,
  heure        text,
  lieu         text,
  responsable  text,
  description  text,
  statut       text not null default 'planifié'
    check (statut in ('planifié','réalisé','annulé','reporté')),
  created_at   timestamptz default now()
);

create index on calendrier_qhse (company_id, date_debut);

alter table calendrier_qhse enable row level security;

create policy "cal_select" on calendrier_qhse for select using (company_id = get_user_company_id());
create policy "cal_insert" on calendrier_qhse for insert with check (company_id = get_user_company_id());
create policy "cal_update" on calendrier_qhse for update using (company_id = get_user_company_id());
create policy "cal_delete" on calendrier_qhse for delete using (company_id = get_user_company_id());
