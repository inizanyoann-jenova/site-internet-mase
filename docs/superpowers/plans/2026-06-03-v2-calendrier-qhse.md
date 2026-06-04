# Calendrier QHSE — Plan d'implémentation V2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un calendrier QHSE permettant de planifier et suivre les audits, formations, réunions et échéances réglementaires avec vue liste filtrée par mois et type.

**Architecture:** Table `calendrier_qhse` pour les événements planifiés. Composant React avec vue liste mensuelle (pas de grille calendrier complexe — vue liste filtrée par mois suffit pour V2) + formulaire de création. Ajouté dans le groupe "Pilotage" de la sidebar.

**Tech Stack:** React 19 + TypeScript, Supabase PostgreSQL, Tailwind CSS, classes `.db-*`, `safeDate` de `kpi-utils`

---

### Task 0 : Migration SQL

**Files :**
- Create : `supabase/migrations/20260604000006_calendrier_qhse.sql`

- [ ] **Step 1 : Créer la migration**

```sql
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
```

- [ ] **Step 2 : Appliquer**

```powershell
npx supabase db push
```
Résultat attendu : `Applying migration 20260604000006_calendrier_qhse.sql... done`

- [ ] **Step 3 : Commit**

```powershell
git add supabase/migrations/20260604000006_calendrier_qhse.sql
git commit -m "feat(v2): migration SQL calendrier QHSE"
```

---

### Task 1 : Composant CalendrierQHSE

**Files :**
- Create : `src/dashboard/CalendrierQHSE.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
// src/dashboard/CalendrierQHSE.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface Evenement {
  id: string;
  titre: string;
  type_evenement: string;
  date_debut: string;
  date_fin: string | null;
  heure: string | null;
  lieu: string | null;
  responsable: string | null;
  description: string | null;
  statut: 'planifié' | 'réalisé' | 'annulé' | 'reporté';
}

const TYPES = ['Audit', 'Formation', 'Réunion', 'Échéance', 'Visite', 'Exercice', 'Autre'];
const STATUTS = ['planifié', 'réalisé', 'annulé', 'reporté'] as const;

const TYPE_COLORS: Record<string, string> = {
  Audit:      'bg-purple-100 text-purple-700',
  Formation:  'bg-blue-100 text-blue-700',
  Réunion:    'bg-yellow-100 text-yellow-700',
  Échéance:   'bg-red-100 text-red-700',
  Visite:     'bg-green-100 text-green-700',
  Exercice:   'bg-orange-100 text-orange-700',
  Autre:      'bg-gray-100 text-gray-600',
};

const STATUT_COLORS: Record<string, string> = {
  planifié: 'bg-blue-100 text-blue-700',
  réalisé:  'bg-green-100 text-green-700',
  annulé:   'bg-red-100 text-red-600',
  reporté:  'bg-yellow-100 text-yellow-700',
};

const MOIS_LABELS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const EMPTY: Omit<Evenement, 'id'> = {
  titre: '', type_evenement: 'Réunion', date_debut: '', date_fin: null,
  heure: null, lieu: null, responsable: null, description: null, statut: 'planifié',
};

interface Props { companyId: string; canWrite: boolean }

export default function CalendrierQHSE({ companyId, canWrite }: Props) {
  const now = new Date();
  const [annee, setAnnee] = useState(now.getFullYear());
  const [moisFilter, setMoisFilter] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('calendrier_qhse')
      .select('*')
      .eq('company_id', companyId)
      .gte('date_debut', `${annee}-01-01`)
      .lte('date_debut', `${annee}-12-31`)
      .order('date_debut');
    setEvenements((data ?? []) as Evenement[]);
  }, [companyId, annee]);

  useEffect(() => { load(); }, [load]);

  function startNew() {
    setForm({ ...EMPTY, date_debut: new Date().toISOString().slice(0, 10) });
    setEditId(null);
    setShowForm(true);
  }

  function startEdit(e: Evenement) {
    const { id, ...rest } = e;
    setForm(rest);
    setEditId(id);
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    if (editId) {
      await supabase.from('calendrier_qhse').update(form).eq('id', editId);
    } else {
      await supabase.from('calendrier_qhse').insert({ ...form, company_id: companyId });
    }
    await load();
    setShowForm(false);
    setSaving(false);
  }

  async function changeStatut(id: string, statut: Evenement['statut']) {
    await supabase.from('calendrier_qhse').update({ statut }).eq('id', id);
    await load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cet événement ?')) return;
    await supabase.from('calendrier_qhse').delete().eq('id', id);
    await load();
  }

  let filtered = evenements;
  if (moisFilter !== null) filtered = filtered.filter(e => new Date(e.date_debut).getMonth() === moisFilter);
  if (typeFilter) filtered = filtered.filter(e => e.type_evenement === typeFilter);

  const upcoming = evenements.filter(e => e.statut === 'planifié' && new Date(e.date_debut) >= now).length;
  const overdue = evenements.filter(e => e.statut === 'planifié' && new Date(e.date_debut) < now).length;

  if (showForm) return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <button className="text-sm text-gray-500 hover:underline" onClick={() => setShowForm(false)}>← Retour</button>
      <h2 className="text-lg font-bold text-gray-900">{editId ? 'Modifier l\'événement' : 'Nouvel événement'}</h2>
      <div className="db-panel space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Titre *</label>
          <input className="db-input" value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} placeholder="Ex : Audit interne sécurité" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
            <select className="db-input" value={form.type_evenement} onChange={e => setForm(f => ({ ...f, type_evenement: e.target.value }))}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Statut</label>
            <select className="db-input" value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value as Evenement['statut'] }))}>
              {STATUTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date *</label>
            <input type="date" className="db-input" value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date de fin</label>
            <input type="date" className="db-input" value={form.date_fin ?? ''} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value || null }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Heure</label>
            <input type="time" className="db-input" value={form.heure ?? ''} onChange={e => setForm(f => ({ ...f, heure: e.target.value || null }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Lieu</label>
            <input className="db-input" value={form.lieu ?? ''} onChange={e => setForm(f => ({ ...f, lieu: e.target.value || null }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Responsable</label>
            <input className="db-input" value={form.responsable ?? ''} onChange={e => setForm(f => ({ ...f, responsable: e.target.value || null }))} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea className="db-input" rows={3} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value || null }))} />
        </div>
        <button className="db-btn-primary" onClick={save} disabled={saving || !form.titre || !form.date_debut}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 p-6">
      <div className="db-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Calendrier QHSE</h1>
          <p className="text-sm text-gray-500">Planning des audits, formations, réunions et échéances</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="db-input w-auto" value={annee} onChange={e => setAnnee(Number(e.target.value))}>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {canWrite && <button className="db-btn-primary" onClick={startNew}>+ Événement</button>}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="db-kpi"><div className="text-2xl font-bold text-blue-600">{upcoming}</div><div className="text-xs text-gray-500">À venir</div></div>
        {overdue > 0 && <div className="db-kpi"><div className="text-2xl font-bold text-red-600">{overdue}</div><div className="text-xs text-gray-500">En retard</div></div>}
        <div className="db-kpi"><div className="text-2xl font-bold text-green-600">{evenements.filter(e => e.statut === 'réalisé').length}</div><div className="text-xs text-gray-500">Réalisés</div></div>
      </div>

      {/* Filtres mois */}
      <div className="flex flex-wrap gap-1">
        <button onClick={() => setMoisFilter(null)} className={`rounded px-2 py-1 text-xs font-medium ${moisFilter === null ? 'bg-mase-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Tous</button>
        {MOIS_LABELS.map((m, i) => (
          <button key={i} onClick={() => setMoisFilter(moisFilter === i ? null : i)} className={`rounded px-2 py-1 text-xs font-medium ${moisFilter === i ? 'bg-mase-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{m.slice(0, 3)}</button>
        ))}
      </div>

      {/* Filtre type */}
      <div className="flex flex-wrap gap-1">
        <button onClick={() => setTypeFilter('')} className={`rounded px-2 py-1 text-xs font-medium ${!typeFilter ? 'bg-mase-green text-white' : 'bg-gray-100 text-gray-600'}`}>Tous types</button>
        {TYPES.map(t => <button key={t} onClick={() => setTypeFilter(typeFilter === t ? '' : t)} className={`rounded px-2 py-1 text-xs font-medium ${typeFilter === t ? 'bg-mase-green text-white' : `${TYPE_COLORS[t]} hover:opacity-80`}`}>{t}</button>)}
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="db-panel p-8 text-center text-gray-400">Aucun événement pour cette période.</div>
        ) : (
          filtered.map(e => {
            const isPast = e.statut === 'planifié' && new Date(e.date_debut) < now;
            return (
              <div key={e.id} className={`db-panel flex items-start justify-between gap-4 ${isPast ? 'border-l-4 border-red-400' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="min-w-[80px] text-right">
                    <div className="text-sm font-bold text-gray-800">{new Date(e.date_debut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</div>
                    {e.heure && <div className="text-xs text-gray-500">{e.heure}</div>}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[e.type_evenement]}`}>{e.type_evenement}</span>
                      <span className="font-medium text-gray-900">{e.titre}</span>
                    </div>
                    {(e.lieu || e.responsable) && (
                      <div className="mt-0.5 text-xs text-gray-500">
                        {e.lieu && <span>📍 {e.lieu}</span>}
                        {e.lieu && e.responsable && <span className="mx-1">·</span>}
                        {e.responsable && <span>👤 {e.responsable}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUT_COLORS[e.statut]}`}>{e.statut}</span>
                  {canWrite && (
                    <div className="flex gap-1">
                      {e.statut === 'planifié' && (
                        <button className="text-xs text-green-600 hover:underline" onClick={() => changeStatut(e.id, 'réalisé')}>✓ Réalisé</button>
                      )}
                      <button className="text-xs text-blue-600 hover:underline" onClick={() => startEdit(e)}>Modifier</button>
                      <button className="text-xs text-red-500 hover:underline" onClick={() => remove(e.id)}>Suppr.</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Commit**

```powershell
git add src/dashboard/CalendrierQHSE.tsx
git commit -m "feat(v2): composant CalendrierQHSE (vue liste mensuelle + CRUD)"
```

---

### Task 2 : Page wrapper + routing + sidebar

**Files :**
- Create : `src/pages/DashboardCalendrierPage.tsx`
- Modify : `src/main.tsx`
- Modify : `src/components/dashboard/DashboardSidebar.tsx`

- [ ] **Step 1 : Créer la page wrapper**

```tsx
// src/pages/DashboardCalendrierPage.tsx
import type { Session } from '@supabase/supabase-js';
import DashboardGuard from '../components/dashboard/DashboardGuard';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import CalendrierQHSE from '../dashboard/CalendrierQHSE';
import { useCompany } from '../hooks/useCompany';

interface Props { session: Session | null }

function CalendrierContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return (
    <DashboardLayout company={company} membership={membership}>
      <CalendrierQHSE companyId={company.id} canWrite={canWrite} />
    </DashboardLayout>
  );
}

export default function DashboardCalendrierPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <CalendrierContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] **Step 2 : Ajouter dans `src/main.tsx`**

Ajouter l'import :
```tsx
import DashboardCalendrierPage from './pages/DashboardCalendrierPage';
```

Ajouter la route :
```tsx
<Route path="/dashboard/calendrier" element={<DashboardCalendrierPage session={session} />} />
```

- [ ] **Step 3 : Ajouter dans `src/components/dashboard/DashboardSidebar.tsx`**

Dans le groupe `Pilotage`, ajouter après "Objectifs QHSE" :
```tsx
{ path: '/dashboard/calendrier', label: 'Calendrier QHSE', icon: '📆' },
```

- [ ] **Step 4 : Vérifier la compilation**

```powershell
npx tsc --noEmit
```
Résultat attendu : aucune erreur

- [ ] **Step 5 : Commit final**

```powershell
git add src/pages/DashboardCalendrierPage.tsx src/main.tsx src/components/dashboard/DashboardSidebar.tsx
git commit -m "feat(v2): route /dashboard/calendrier + sidebar"
```
