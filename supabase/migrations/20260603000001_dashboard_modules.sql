-- ─── 1. TABLE risques (DUERP) ────────────────────────────────────────────────
create table if not exists risques (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references companies(id) on delete cascade,
  date_maj              date,
  unite_travail         text not null default '',
  famille_risque        text,
  danger                text not null,
  evenement_declencheur text,
  dommage_potentiel     text,
  personnes_exposees    text,
  gravite               int not null default 2 check (gravite between 1 and 4),
  probabilite           int not null default 2 check (probabilite between 1 and 4),
  criticite             int not null default 4,
  a_mesure_epc          boolean not null default false,
  mesures_epc           text,
  a_mesure_orga         boolean not null default false,
  mesures_orga          text,
  a_mesure_epi          boolean not null default false,
  mesures_epi           text,
  criticite_resid       int not null default 4,
  coefficient_reducteur numeric(4,2) not null default 1.00,
  action_preventive     text,
  pilote                text,
  echeance              date,
  archived_at           timestamptz,
  archived_by           text,
  created_at            timestamptz default now()
);

alter table risques enable row level security;

create policy "risques_select" on risques for select
  using (company_id = get_user_company_id());

create policy "risques_insert" on risques for insert
  with check (company_id = get_user_company_id());

create policy "risques_update" on risques for update
  using (company_id = get_user_company_id());

create policy "risques_delete" on risques for delete
  using (company_id = get_user_company_id());

create index on risques (company_id);

-- ─── 2. TABLE actions (PDCA) ─────────────────────────────────────────────────
create table if not exists actions (
  id                            uuid primary key default gen_random_uuid(),
  company_id                    uuid not null references companies(id) on delete cascade,
  origine                       text not null default 'Autre',
  reference_source              text,
  domaine                       text not null default 'Sécurité',
  type_action                   text default 'Corrective',
  action                        text not null,
  cause_racine                  text,
  pilote                        text,
  echeance                      date,
  date_cible_revisee            date,
  priorite                      text not null default '🟡 Normale',
  statut                        text not null default 'À lancer',
  avancement_pct                int not null default 0 check (avancement_pct between 0 and 100),
  cout_estime                   numeric(10,2),
  cout_reel                     numeric(10,2),
  date_verification_efficacite  date,
  resultat_efficacite           text default 'Non évalué',
  commentaire                   text,
  archived_at                   timestamptz,
  archived_by                   text,
  created_at                    timestamptz default now()
);

alter table actions enable row level security;

create policy "actions_select" on actions for select
  using (company_id = get_user_company_id());

create policy "actions_insert" on actions for insert
  with check (company_id = get_user_company_id());

create policy "actions_update" on actions for update
  using (company_id = get_user_company_id());

create policy "actions_delete" on actions for delete
  using (company_id = get_user_company_id());

create index on actions (company_id);

-- ─── 3. TABLE accidents ──────────────────────────────────────────────────────
create table if not exists accidents (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references companies(id) on delete cascade,
  date_evenement      date not null,
  type_evenement      text not null default 'Presqu''accident',
  lieu                text not null default 'Atelier',
  description         text not null default '',
  cause_immediate     text,
  victime             text,
  temoin              text,
  jours_perdus        int not null default 0,
  statut_enquete      text not null default 'À lancer',
  mesures_immediates  text,
  actions_correctives text,
  archived_at         timestamptz,
  archived_by         text,
  created_at          timestamptz default now()
);

alter table accidents enable row level security;

create policy "accidents_select" on accidents for select
  using (company_id = get_user_company_id());

create policy "accidents_insert" on accidents for insert
  with check (company_id = get_user_company_id());

create policy "accidents_update" on accidents for update
  using (company_id = get_user_company_id());

create policy "accidents_delete" on accidents for delete
  using (company_id = get_user_company_id());

create index on accidents (company_id);

-- ─── 4. TABLE habilitations ──────────────────────────────────────────────────
create table if not exists habilitations (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  employe      text not null,
  domaine      text not null,
  obtention    date,
  validite_ans int not null default 2,
  created_at   timestamptz default now()
);

alter table habilitations enable row level security;

create policy "habilitations_select" on habilitations for select
  using (company_id = get_user_company_id());

create policy "habilitations_insert" on habilitations for insert
  with check (company_id = get_user_company_id());

create policy "habilitations_update" on habilitations for update
  using (company_id = get_user_company_id());

create policy "habilitations_delete" on habilitations for delete
  using (company_id = get_user_company_id());

create index on habilitations (company_id);

-- ─── 5. TABLE kpi_objectifs (config KPIs par company) ───────────────────────
create table if not exists kpi_objectifs (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null unique references companies(id) on delete cascade,
  effectif        int not null default 50,
  h_an            int not null default 1607,
  tf              numeric(5,2) not null default 10,
  tg              numeric(5,2) not null default 1,
  taux_cloture    int not null default 70,
  taux_habs       int not null default 90,
  taux_maitrise   int not null default 70,
  acc_arret       int not null default 0,
  actions_retard  int not null default 0,
  satisfaction    numeric(3,1) not null default 7.0,
  updated_at      timestamptz default now()
);

alter table kpi_objectifs enable row level security;

create policy "kpi_objectifs_select" on kpi_objectifs for select
  using (company_id = get_user_company_id());

create policy "kpi_objectifs_insert" on kpi_objectifs for insert
  with check (company_id = get_user_company_id());

create policy "kpi_objectifs_update" on kpi_objectifs for update
  using (company_id = get_user_company_id());

create index on kpi_objectifs (company_id);
