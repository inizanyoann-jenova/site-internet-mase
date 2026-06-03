-- ─── 1. TABLE objectifs_qhse ─────────────────────────────────────────────────
create table if not exists objectifs_qhse (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  annee         integer not null default extract(year from now())::integer,
  categorie     text not null default 'securite',
  titre         text not null,
  description   text,
  valeur_cible  numeric not null default 0,
  valeur_reelle numeric,
  unite         text not null default '%',
  sens          text not null default 'max',
  actif         boolean not null default true,
  created_at    timestamptz default now()
);
alter table objectifs_qhse enable row level security;
create policy "objectifs_qhse_select" on objectifs_qhse for select using (company_id = get_user_company_id());
create policy "objectifs_qhse_insert" on objectifs_qhse for insert with check (company_id = get_user_company_id());
create policy "objectifs_qhse_update" on objectifs_qhse for update using (company_id = get_user_company_id());
create policy "objectifs_qhse_delete" on objectifs_qhse for delete using (company_id = get_user_company_id());
create index on objectifs_qhse (company_id);

-- ─── 2. TABLE reunions_qhse ──────────────────────────────────────────────────
create table if not exists reunions_qhse (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  date          date not null,
  type          text not null default 'Réunion Sécurité',
  lieu          text,
  animateur     text,
  participants  text,
  ordre_du_jour text,
  decisions     text,
  statut        text not null default 'Planifiée',
  actions_json  text not null default '[]',
  created_at    timestamptz default now()
);
alter table reunions_qhse enable row level security;
create policy "reunions_qhse_select" on reunions_qhse for select using (company_id = get_user_company_id());
create policy "reunions_qhse_insert" on reunions_qhse for insert with check (company_id = get_user_company_id());
create policy "reunions_qhse_update" on reunions_qhse for update using (company_id = get_user_company_id());
create policy "reunions_qhse_delete" on reunions_qhse for delete using (company_id = get_user_company_id());
create index on reunions_qhse (company_id);

-- ─── 3. TABLE qualite_audits ─────────────────────────────────────────────────
create table if not exists qualite_audits (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  titre       text not null default 'Audit',
  type_audit  text not null default 'Audit interne',
  processus   text not null default 'Direction',
  auditeur    text,
  date        date,
  statut      text not null default 'Planifié',
  score       integer not null default 0,
  created_at  timestamptz default now()
);
alter table qualite_audits enable row level security;
create policy "qualite_audits_select" on qualite_audits for select using (company_id = get_user_company_id());
create policy "qualite_audits_insert" on qualite_audits for insert with check (company_id = get_user_company_id());
create policy "qualite_audits_update" on qualite_audits for update using (company_id = get_user_company_id());
create policy "qualite_audits_delete" on qualite_audits for delete using (company_id = get_user_company_id());
create index on qualite_audits (company_id);

-- ─── 4. TABLE qualite_nc ─────────────────────────────────────────────────────
create table if not exists qualite_nc (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references companies(id) on delete cascade,
  date_nc           date,
  processus         text not null default 'Direction',
  origine           text not null default 'Interne',
  type_nc           text not null default 'Mineure',
  description       text not null default '',
  action_corrective text not null default '',
  statut_nc         text not null default 'Ouverte',
  archived_at       timestamptz,
  created_at        timestamptz default now()
);
alter table qualite_nc enable row level security;
create policy "qualite_nc_select" on qualite_nc for select using (company_id = get_user_company_id());
create policy "qualite_nc_insert" on qualite_nc for insert with check (company_id = get_user_company_id());
create policy "qualite_nc_update" on qualite_nc for update using (company_id = get_user_company_id());
create policy "qualite_nc_delete" on qualite_nc for delete using (company_id = get_user_company_id());
create index on qualite_nc (company_id);

-- ─── 5. TABLE qualite_satisfaction ──────────────────────────────────────────
create table if not exists qualite_satisfaction (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  date_enquete  date,
  client        text not null default '',
  projet        text not null default '',
  note_globale  numeric not null default 8,
  commentaire   text,
  created_at    timestamptz default now()
);
alter table qualite_satisfaction enable row level security;
create policy "qualite_satisfaction_select" on qualite_satisfaction for select using (company_id = get_user_company_id());
create policy "qualite_satisfaction_insert" on qualite_satisfaction for insert with check (company_id = get_user_company_id());
create policy "qualite_satisfaction_update" on qualite_satisfaction for update using (company_id = get_user_company_id());
create policy "qualite_satisfaction_delete" on qualite_satisfaction for delete using (company_id = get_user_company_id());
create index on qualite_satisfaction (company_id);

-- ─── 6. TABLE qualite_qvt ────────────────────────────────────────────────────
create table if not exists qualite_qvt (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  date_campagne   date,
  nom_campagne    text not null default 'Sondage QVT',
  effectif_total  integer not null default 10,
  reponses        integer not null default 0,
  note_moyenne    numeric not null default 5,
  created_at      timestamptz default now()
);
alter table qualite_qvt enable row level security;
create policy "qualite_qvt_select" on qualite_qvt for select using (company_id = get_user_company_id());
create policy "qualite_qvt_insert" on qualite_qvt for insert with check (company_id = get_user_company_id());
create policy "qualite_qvt_update" on qualite_qvt for update using (company_id = get_user_company_id());
create policy "qualite_qvt_delete" on qualite_qvt for delete using (company_id = get_user_company_id());
create index on qualite_qvt (company_id);

-- ─── 7. TABLE rh_employes ────────────────────────────────────────────────────
create table if not exists rh_employes (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  nom          text not null,
  prenom       text not null default '',
  poste        text not null default 'Opérateur',
  service      text not null default 'Production',
  contrat      text not null default 'CDI',
  date_entree  date,
  actif        boolean not null default true,
  created_at   timestamptz default now()
);
alter table rh_employes enable row level security;
create policy "rh_employes_select" on rh_employes for select using (company_id = get_user_company_id());
create policy "rh_employes_insert" on rh_employes for insert with check (company_id = get_user_company_id());
create policy "rh_employes_update" on rh_employes for update using (company_id = get_user_company_id());
create policy "rh_employes_delete" on rh_employes for delete using (company_id = get_user_company_id());
create index on rh_employes (company_id);

-- ─── 8. TABLE rh_formations ──────────────────────────────────────────────────
create table if not exists rh_formations (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  titre           text not null,
  type_formation  text not null default 'Sécurité',
  organisme       text not null default 'Organisme interne',
  date_debut      date,
  date_fin        date,
  participants    text not null default '',
  statut          text not null default 'Planifiée',
  duree_heures    numeric,
  created_at      timestamptz default now()
);
alter table rh_formations enable row level security;
create policy "rh_formations_select" on rh_formations for select using (company_id = get_user_company_id());
create policy "rh_formations_insert" on rh_formations for insert with check (company_id = get_user_company_id());
create policy "rh_formations_update" on rh_formations for update using (company_id = get_user_company_id());
create policy "rh_formations_delete" on rh_formations for delete using (company_id = get_user_company_id());
create index on rh_formations (company_id);
