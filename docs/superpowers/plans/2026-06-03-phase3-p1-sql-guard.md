# Phase 3 — Partie 1 : Migration SQL + DashboardGuard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer les 8 tables Supabase pour les modules Phase 3 et corriger le DashboardGuard pour bloquer les abonnements annulés.

**Architecture:** Même pattern que `20260603000001_dashboard_modules.sql` — chaque table a `company_id` + RLS via `get_user_company_id()`. Le fix Guard ajoute une redirection vers `/dashboard/acheter` quand `subscription_status === 'canceled'`.

**Tech Stack:** Supabase SQL, React TypeScript

---

### Task 0 : Migration SQL — 8 tables Phase 3

**Files:**
- Create: `supabase/migrations/20260603000002_phase3_modules.sql`

- [ ] Créer le fichier `supabase/migrations/20260603000002_phase3_modules.sql` avec ce contenu exact :

```sql
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
```

- [ ] Appliquer la migration via Supabase MCP (`mcp__claude_ai_Supabase__apply_migration`), project `ulceeurwibmbtnqhkaao`, nom `phase3_modules`

- [ ] Vérifier les 8 tables avec `mcp__claude_ai_Supabase__list_tables`

- [ ] Commit :
```bash
git add supabase/migrations/20260603000002_phase3_modules.sql
git commit -m "feat(db): 8 tables Phase 3 avec RLS — objectifs, réunions, qualité, RH"
```

---

### Task 1 : Fix DashboardGuard — subscription_status

**Files:**
- Modify: `src/components/dashboard/DashboardGuard.tsx:48`

Le `DashboardGuard` actuel (ligne 48) vérifie `!company || !membership` mais ne vérifie pas si l'abonnement est annulé. Un client dont l'abonnement a été annulé (`canceled`) accède encore au dashboard. À corriger.

- [ ] Dans `src/components/dashboard/DashboardGuard.tsx`, remplacer :

```tsx
  if (!company || !membership) {
    return <Navigate to="/dashboard/onboarding" replace />;
  }

  return (
```

par :

```tsx
  if (!company || !membership) {
    return <Navigate to="/dashboard/onboarding" replace />;
  }

  if (company.subscription_status === 'canceled') {
    return <Navigate to="/dashboard/acheter" replace />;
  }

  return (
```

- [ ] Vérifier que `company.subscription_status` est bien un champ de l'interface `Company` dans `src/hooks/useCompany.ts` (il l'est — ligne 9 du fichier).

- [ ] Commit :
```bash
git add src/components/dashboard/DashboardGuard.tsx
git commit -m "fix(dashboard): redirect abonnements annulés vers la page d'achat"
```

---

### Task 2 : Ajouter tauxAtteinteObjectif à kpi-utils.ts

**Files:**
- Modify: `src/dashboard/kpi-utils.ts`

`ObjectifsQHSE.tsx` (Phase 2) utilisera cette fonction pour calculer le pourcentage d'atteinte d'un objectif.

- [ ] Ajouter à la fin de `src/dashboard/kpi-utils.ts` :

```ts
export function tauxAtteinteObjectif(
  reel: number,
  cible: number,
  sens: 'max' | 'min'
): number {
  if (cible === 0) return reel === 0 ? 100 : sens === 'min' ? 0 : 100;
  if (sens === 'min') {
    return Math.min(100, Math.max(0, Math.round((1 - (reel - cible) / cible) * 100)));
  }
  return Math.min(100, Math.max(0, Math.round((reel / cible) * 100)));
}
```

- [ ] Commit :
```bash
git add src/dashboard/kpi-utils.ts
git commit -m "feat(dashboard): add tauxAtteinteObjectif to kpi-utils"
```
