-- supabase/migrations/20260604000004_fournisseurs.sql

create table if not exists fournisseurs (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies(id) on delete cascade,
  nom            text not null,
  activite       text,
  contact_nom    text,
  contact_email  text,
  contact_tel    text,
  statut         text not null default 'actif' check (statut in ('actif','suspendu','archivé')),
  note_globale   numeric(3,1),
  derniere_eval  date,
  created_at     timestamptz default now()
);

create index on fournisseurs (company_id);

alter table fournisseurs enable row level security;

create policy "fourn_select" on fournisseurs for select using (company_id = get_user_company_id());
create policy "fourn_insert" on fournisseurs for insert with check (company_id = get_user_company_id());
create policy "fourn_update" on fournisseurs for update using (company_id = get_user_company_id());
create policy "fourn_delete" on fournisseurs for delete using (company_id = get_user_company_id());

create table if not exists evaluations_fournisseur (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references companies(id) on delete cascade,
  fournisseur_id   uuid not null references fournisseurs(id) on delete cascade,
  date_evaluation  date not null default current_date,
  note_qualite     int not null default 3 check (note_qualite between 1 and 5),
  note_delais      int not null default 3 check (note_delais between 1 and 5),
  note_securite    int not null default 3 check (note_securite between 1 and 5),
  note_prix        int not null default 3 check (note_prix between 1 and 5),
  note_service     int not null default 3 check (note_service between 1 and 5),
  note_globale     numeric(3,1) generated always as (
    (note_qualite + note_delais + note_securite + note_prix + note_service)::numeric / 5
  ) stored,
  evaluateur       text,
  commentaire      text,
  created_at       timestamptz default now()
);

create index on evaluations_fournisseur (company_id, fournisseur_id);

alter table evaluations_fournisseur enable row level security;

create policy "eval_fourn_select" on evaluations_fournisseur for select using (company_id = get_user_company_id());
create policy "eval_fourn_insert" on evaluations_fournisseur for insert with check (company_id = get_user_company_id());
create policy "eval_fourn_update" on evaluations_fournisseur for update using (company_id = get_user_company_id());
create policy "eval_fourn_delete" on evaluations_fournisseur for delete using (company_id = get_user_company_id());
