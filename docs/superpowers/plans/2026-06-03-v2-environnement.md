# Suivi Environnemental — Plan d'implémentation V2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un module de suivi environnemental permettant de saisir les consommations (énergie, eau, déchets, CO₂) par période et de visualiser les tendances.

**Architecture:** Deux tables — `flux_environnement` pour les relevés et `objectifs_environnement` pour les cibles annuelles. Composant React avec saisie mensuelle, KPIs de synthèse et graphique Recharts (LineChart). Nouveau groupe "Environnement" dans la sidebar.

**Tech Stack:** React 19 + TypeScript, Supabase PostgreSQL, Recharts (LineChart), Tailwind CSS, classes `.db-*`, `safeNumber` de `kpi-utils`

---

### Task 0 : Migration SQL

**Files :**
- Create : `supabase/migrations/20260604000003_environnement.sql`

- [ ] **Step 1 : Créer la migration**

```sql
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
```

- [ ] **Step 2 : Appliquer**

```powershell
npx supabase db push
```
Résultat attendu : `Applying migration 20260604000003_environnement.sql... done`

- [ ] **Step 3 : Commit**

```powershell
git add supabase/migrations/20260604000003_environnement.sql
git commit -m "feat(v2): migration SQL suivi environnemental"
```

---

### Task 1 : Composant EnvironnementSuivi

**Files :**
- Create : `src/dashboard/EnvironnementSuivi.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
// src/dashboard/EnvironnementSuivi.tsx
import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { safeNumber } from './kpi-utils';

type FluxType = 'energie_kwh' | 'eau_m3' | 'dechets_kg' | 'co2_kg' | 'autre';

interface FluxRow {
  id: string;
  annee: number;
  mois: number;
  type_flux: FluxType;
  valeur: number;
  commentaire: string | null;
}

interface ObjRow {
  type_flux: string;
  cible_annuelle: number | null;
}

const FLUX_CONFIG: Record<FluxType, { label: string; unite: string; color: string }> = {
  energie_kwh: { label: 'Énergie', unite: 'kWh', color: '#f59e0b' },
  eau_m3:      { label: 'Eau', unite: 'm³', color: '#3b82f6' },
  dechets_kg:  { label: 'Déchets', unite: 'kg', color: '#10b981' },
  co2_kg:      { label: 'CO₂', unite: 'kg', color: '#6b7280' },
  autre:       { label: 'Autre', unite: '', color: '#8b5cf6' },
};

const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

interface Props {
  companyId: string;
  canWrite: boolean;
}

export default function EnvironnementSuivi({ companyId, canWrite }: Props) {
  const currentYear = new Date().getFullYear();
  const [annee, setAnnee] = useState(currentYear);
  const [flux, setFlux] = useState<FluxRow[]>([]);
  const [objectifs, setObjectifs] = useState<ObjRow[]>([]);
  const [activeFlux, setActiveFlux] = useState<FluxType>('energie_kwh');
  const [editCell, setEditCell] = useState<{ mois: number; type: FluxType } | null>(null);
  const [editVal, setEditVal] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [{ data: f }, { data: o }] = await Promise.all([
      supabase.from('flux_environnement').select('*').eq('company_id', companyId).eq('annee', annee),
      supabase.from('objectifs_environnement').select('*').eq('company_id', companyId).eq('annee', annee),
    ]);
    setFlux((f ?? []) as FluxRow[]);
    setObjectifs((o ?? []) as ObjRow[]);
  }, [companyId, annee]);

  useEffect(() => { load(); }, [load]);

  function getValue(mois: number, type: FluxType): number {
    return safeNumber(flux.find(f => f.mois === mois && f.type_flux === type)?.valeur, 0);
  }

  function getTotal(type: FluxType): number {
    return flux.filter(f => f.type_flux === type).reduce((s, f) => s + safeNumber(f.valeur, 0), 0);
  }

  function getObjectif(type: FluxType): number | null {
    return objectifs.find(o => o.type_flux === type)?.cible_annuelle ?? null;
  }

  async function saveCell() {
    if (!editCell) return;
    setSaving(true);
    const existing = flux.find(f => f.mois === editCell.mois && f.type_flux === editCell.type);
    const valeur = parseFloat(editVal) || 0;
    if (existing) {
      await supabase.from('flux_environnement').update({ valeur }).eq('id', existing.id);
    } else {
      await supabase.from('flux_environnement').insert({
        company_id: companyId, annee, mois: editCell.mois, type_flux: editCell.type, valeur,
      });
    }
    await load();
    setEditCell(null);
    setSaving(false);
  }

  const chartData = MOIS_LABELS.map((label, i) => {
    const mois = i + 1;
    const row: Record<string, unknown> = { mois: label };
    (Object.keys(FLUX_CONFIG) as FluxType[]).forEach(t => {
      row[t] = getValue(mois, t);
    });
    return row;
  });

  return (
    <div className="space-y-5 p-6">
      <div className="db-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Suivi Environnemental</h1>
          <p className="text-sm text-gray-500">Consommations énergie, eau, déchets et CO₂</p>
        </div>
        <select className="db-input w-auto" value={annee} onChange={e => setAnnee(Number(e.target.value))}>
          {[currentYear - 1, currentYear, currentYear + 1].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* KPIs annuels */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(Object.entries(FLUX_CONFIG) as [FluxType, typeof FLUX_CONFIG[FluxType]][]).filter(([k]) => k !== 'autre').map(([type, cfg]) => {
          const total = getTotal(type);
          const obj = getObjectif(type);
          const pct = obj ? Math.round((total / obj) * 100) : null;
          return (
            <div key={type} className="db-kpi">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{cfg.label}</div>
              <div className="text-2xl font-bold text-gray-900">
                {total.toLocaleString('fr-FR')} <span className="text-sm font-normal text-gray-500">{cfg.unite}</span>
              </div>
              {obj !== null && (
                <div className={`text-xs ${pct! > 100 ? 'text-red-600' : 'text-green-600'}`}>
                  Objectif : {obj.toLocaleString('fr-FR')} {cfg.unite} ({pct}%)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Graphique */}
      <div className="db-panel">
        <div className="mb-3 flex gap-2">
          {(Object.entries(FLUX_CONFIG) as [FluxType, typeof FLUX_CONFIG[FluxType]][]).filter(([k]) => k !== 'autre').map(([type, cfg]) => (
            <button
              key={type}
              onClick={() => setActiveFlux(type)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${activeFlux === type ? 'bg-mase-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey={activeFlux}
              name={FLUX_CONFIG[activeFlux].label}
              stroke={FLUX_CONFIG[activeFlux].color}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Grille de saisie mensuelle */}
      <div className="db-panel overflow-x-auto p-0">
        <table className="db-table">
          <thead>
            <tr>
              <th>Mois</th>
              {(Object.entries(FLUX_CONFIG) as [FluxType, typeof FLUX_CONFIG[FluxType]][]).map(([type, cfg]) => (
                <th key={type}>{cfg.label} ({cfg.unite || '—'})</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOIS_LABELS.map((label, i) => {
              const mois = i + 1;
              return (
                <tr key={mois}>
                  <td className="font-medium text-gray-600">{label}</td>
                  {(Object.keys(FLUX_CONFIG) as FluxType[]).map(type => {
                    const isEditing = editCell?.mois === mois && editCell?.type === type;
                    const val = getValue(mois, type);
                    return (
                      <td key={type}>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              className="db-input w-24"
                              type="number"
                              min="0"
                              value={editVal}
                              onChange={e => setEditVal(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveCell(); if (e.key === 'Escape') setEditCell(null); }}
                              autoFocus
                            />
                            <button className="db-btn-primary py-1 px-2 text-xs" onClick={saveCell} disabled={saving}>✓</button>
                          </div>
                        ) : (
                          <span
                            className={`${canWrite ? 'cursor-pointer hover:underline' : ''} text-sm`}
                            onClick={() => {
                              if (!canWrite) return;
                              setEditCell({ mois, type });
                              setEditVal(val > 0 ? String(val) : '');
                            }}
                          >
                            {val > 0 ? val.toLocaleString('fr-FR') : <span className="text-gray-300">—</span>}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Commit**

```powershell
git add src/dashboard/EnvironnementSuivi.tsx
git commit -m "feat(v2): composant EnvironnementSuivi (KPIs + graphique + saisie mensuelle)"
```

---

### Task 2 : Page wrapper + routing + sidebar

**Files :**
- Create : `src/pages/DashboardEnvironnementPage.tsx`
- Modify : `src/main.tsx`
- Modify : `src/components/dashboard/DashboardSidebar.tsx`

- [ ] **Step 1 : Créer la page wrapper**

```tsx
// src/pages/DashboardEnvironnementPage.tsx
import type { Session } from '@supabase/supabase-js';
import DashboardGuard from '../components/dashboard/DashboardGuard';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import EnvironnementSuivi from '../dashboard/EnvironnementSuivi';
import { useCompany } from '../hooks/useCompany';

interface Props { session: Session | null }

function EnvContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return (
    <DashboardLayout company={company} membership={membership}>
      <EnvironnementSuivi companyId={company.id} canWrite={canWrite} />
    </DashboardLayout>
  );
}

export default function DashboardEnvironnementPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <EnvContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] **Step 2 : Ajouter dans `src/main.tsx`**

Ajouter l'import :
```tsx
import DashboardEnvironnementPage from './pages/DashboardEnvironnementPage';
```

Ajouter la route :
```tsx
<Route path="/dashboard/environnement" element={<DashboardEnvironnementPage session={session} />} />
```

- [ ] **Step 3 : Ajouter dans `src/components/dashboard/DashboardSidebar.tsx`**

Dans `SIDEBAR_GROUPS`, ajouter un nouveau groupe après "Qualité / RH" :
```tsx
{
  label: 'Environnement',
  items: [
    { path: '/dashboard/environnement', label: 'Suivi Environnemental', icon: '🌱' },
  ],
},
```

- [ ] **Step 4 : Vérifier la compilation**

```powershell
npx tsc --noEmit
```
Résultat attendu : aucune erreur

- [ ] **Step 5 : Commit final**

```powershell
git add src/pages/DashboardEnvironnementPage.tsx src/main.tsx src/components/dashboard/DashboardSidebar.tsx
git commit -m "feat(v2): route /dashboard/environnement + groupe sidebar Environnement"
```
