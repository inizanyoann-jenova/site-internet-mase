-- supabase/migrations/20260604000010_risques_chantier.sql

create table if not exists risques_chantier (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references companies(id) on delete cascade,
  chantier         text not null,
  localisation     text,
  date_analyse     date not null default current_date,
  heure_debut      text,
  risques_identifies jsonb not null default '[]',
  niveau_risque    text not null default 'Moyen'
    check (niveau_risque in ('Faible','Moyen','Élevé','Inacceptable')),
  mesures_retenues text,
  operateur        text not null,
  statut           text not null default 'en_cours'
    check (statut in ('en_cours','validé','terminé')),
  visa_responsable text,
  notes            text,
  created_at       timestamptz default now()
);

create index on risques_chantier (company_id, date_analyse desc);

alter table risques_chantier enable row level security;

create policy "rc_select" on risques_chantier for select using (company_id = get_user_company_id());
create policy "rc_insert" on risques_chantier for insert with check (company_id = get_user_company_id());
create policy "rc_update" on risques_chantier for update using (company_id = get_user_company_id());
create policy "rc_delete" on risques_chantier for delete using (company_id = get_user_company_id());
