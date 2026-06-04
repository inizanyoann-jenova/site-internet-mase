-- supabase/migrations/20260604000007_veille_reglementaire.sql

create table if not exists textes_reglementaires (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references companies(id) on delete cascade,
  reference           text not null,
  titre               text not null,
  domaine             text not null default 'Sécurité'
    check (domaine in ('Sécurité','Environnement','Travail','Qualité','MASE','Autre')),
  type_texte          text not null default 'Loi'
    check (type_texte in ('Loi','Décret','Arrêté','Norme','Circulaire','Référentiel','Autre')),
  date_parution       date,
  date_echeance       date,
  statut_conformite   text not null default 'en_cours'
    check (statut_conformite in ('conforme','en_cours','non_conforme','sans_objet')),
  actions_requises    text,
  responsable         text,
  notes               text,
  lien_url            text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index on textes_reglementaires (company_id, domaine);
create index on textes_reglementaires (company_id, date_echeance) where date_echeance is not null;

alter table textes_reglementaires enable row level security;

create policy "veille_select" on textes_reglementaires for select using (company_id = get_user_company_id());
create policy "veille_insert" on textes_reglementaires for insert with check (company_id = get_user_company_id());
create policy "veille_update" on textes_reglementaires for update using (company_id = get_user_company_id());
create policy "veille_delete" on textes_reglementaires for delete using (company_id = get_user_company_id());
