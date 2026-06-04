-- supabase/migrations/20260604000005_rgpd.sql

create table if not exists registre_traitements (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references companies(id) on delete cascade,
  nom_traitement        text not null,
  finalite              text not null,
  responsable_nom       text,
  sous_traitants        text,
  categories_personnes  text not null default 'Employés',
  categories_donnees    text not null,
  destinataires         text,
  transfert_hors_ue     boolean not null default false,
  pays_transfert        text,
  duree_conservation    text not null,
  base_legale           text not null default 'Intérêt légitime',
  mesures_securite      text,
  statut_conformite     text not null default 'en_cours' check (statut_conformite in ('conforme','en_cours','non_conforme')),
  notes                 text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index on registre_traitements (company_id);

alter table registre_traitements enable row level security;

create policy "rgpd_select" on registre_traitements for select using (company_id = get_user_company_id());
create policy "rgpd_insert" on registre_traitements for insert with check (company_id = get_user_company_id());
create policy "rgpd_update" on registre_traitements for update using (company_id = get_user_company_id());
create policy "rgpd_delete" on registre_traitements for delete using (company_id = get_user_company_id());
