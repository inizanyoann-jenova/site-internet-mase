# Fournisseurs / Évaluation — Plan d'implémentation V2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un module de gestion et d'évaluation des fournisseurs avec une grille de notation multicritères (qualité, délais, sécurité, prix, service) calculant une note globale automatiquement.

**Architecture:** Deux tables — `fournisseurs` (fiche fournisseur) et `evaluations_fournisseur` (évaluations datées avec 5 critères). La note globale est calculée côté client (moyenne pondérée égale). Composant React avec liste fournisseurs + formulaire d'évaluation. Ajouté dans le groupe "Qualité / RH" de la sidebar.

**Tech Stack:** React 19 + TypeScript, Supabase PostgreSQL, Tailwind CSS, classes `.db-*`, `safeNumber` de `kpi-utils`

---

### Task 0 : Migration SQL

**Files :**
- Create : `supabase/migrations/20260604000004_fournisseurs.sql`

- [ ] **Step 1 : Créer la migration**

```sql
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
```

- [ ] **Step 2 : Appliquer**

```powershell
npx supabase db push
```
Résultat attendu : `Applying migration 20260604000004_fournisseurs.sql... done`

- [ ] **Step 3 : Commit**

```powershell
git add supabase/migrations/20260604000004_fournisseurs.sql
git commit -m "feat(v2): migration SQL fournisseurs + évaluations"
```

---

### Task 1 : Composant FournisseursEvaluation

**Files :**
- Create : `src/dashboard/FournisseursEvaluation.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
// src/dashboard/FournisseursEvaluation.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { safeNumber } from './kpi-utils';

interface Fournisseur {
  id: string;
  nom: string;
  activite: string | null;
  contact_nom: string | null;
  contact_email: string | null;
  contact_tel: string | null;
  statut: 'actif' | 'suspendu' | 'archivé';
  note_globale: number | null;
  derniere_eval: string | null;
}

interface Evaluation {
  id: string;
  fournisseur_id: string;
  date_evaluation: string;
  note_qualite: number;
  note_delais: number;
  note_securite: number;
  note_prix: number;
  note_service: number;
  note_globale: number;
  evaluateur: string | null;
  commentaire: string | null;
}

const CRITERES: { key: keyof Pick<Evaluation, 'note_qualite' | 'note_delais' | 'note_securite' | 'note_prix' | 'note_service'>; label: string }[] = [
  { key: 'note_qualite', label: 'Qualité' },
  { key: 'note_delais', label: 'Délais' },
  { key: 'note_securite', label: 'Sécurité' },
  { key: 'note_prix', label: 'Prix' },
  { key: 'note_service', label: 'Service' },
];

const STATUT_COLORS: Record<string, string> = {
  actif: 'bg-green-100 text-green-700',
  suspendu: 'bg-yellow-100 text-yellow-700',
  archivé: 'bg-gray-100 text-gray-500',
};

const NOTE_COLORS = ['', 'bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-yellow-100 text-yellow-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700'];

type View = 'liste' | 'detail' | 'new-eval' | 'new-fourn';

const FOURN_INIT: Omit<Fournisseur, 'id' | 'note_globale' | 'derniere_eval'> = {
  nom: '', activite: null, contact_nom: null, contact_email: null, contact_tel: null, statut: 'actif',
};

const EVAL_INIT = {
  note_qualite: 3, note_delais: 3, note_securite: 3, note_prix: 3, note_service: 3,
  evaluateur: '', commentaire: '',
};

interface Props {
  companyId: string;
  canWrite: boolean;
}

export default function FournisseursEvaluation({ companyId, canWrite }: Props) {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [view, setView] = useState<View>('liste');
  const [selected, setSelected] = useState<Fournisseur | null>(null);
  const [fourn, setFourn] = useState({ ...FOURN_INIT });
  const [evalForm, setEvalForm] = useState({ ...EVAL_INIT });
  const [saving, setSaving] = useState(false);
  const [filterStatut, setFilterStatut] = useState('actif');

  const load = useCallback(async () => {
    const [{ data: f }, { data: e }] = await Promise.all([
      supabase.from('fournisseurs').select('*').eq('company_id', companyId).order('nom'),
      supabase.from('evaluations_fournisseur').select('*').eq('company_id', companyId).order('date_evaluation', { ascending: false }),
    ]);
    setFournisseurs((f ?? []) as Fournisseur[]);
    setEvaluations((e ?? []) as Evaluation[]);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  async function saveFournisseur() {
    setSaving(true);
    await supabase.from('fournisseurs').insert({ ...fourn, company_id: companyId });
    await load();
    setFourn({ ...FOURN_INIT });
    setView('liste');
    setSaving(false);
  }

  async function saveEvaluation() {
    if (!selected) return;
    setSaving(true);
    const note = (evalForm.note_qualite + evalForm.note_delais + evalForm.note_securite + evalForm.note_prix + evalForm.note_service) / 5;
    await supabase.from('evaluations_fournisseur').insert({
      ...evalForm,
      company_id: companyId,
      fournisseur_id: selected.id,
      date_evaluation: new Date().toISOString().slice(0, 10),
    });
    await supabase.from('fournisseurs').update({ note_globale: Math.round(note * 10) / 10, derniere_eval: new Date().toISOString().slice(0, 10) }).eq('id', selected.id);
    await load();
    setEvalForm({ ...EVAL_INIT });
    setView('detail');
    setSaving(false);
  }

  async function toggleStatut(f: Fournisseur) {
    const next = f.statut === 'actif' ? 'suspendu' : f.statut === 'suspendu' ? 'archivé' : 'actif';
    await supabase.from('fournisseurs').update({ statut: next }).eq('id', f.id);
    await load();
  }

  const filtered = fournisseurs.filter(f => !filterStatut || f.statut === filterStatut);
  const evalsDeFourn = selected ? evaluations.filter(e => e.fournisseur_id === selected.id) : [];

  const avgNote = fournisseurs.filter(f => f.statut === 'actif' && f.note_globale).reduce((s, f) => s + safeNumber(f.note_globale, 0), 0) / (fournisseurs.filter(f => f.statut === 'actif' && f.note_globale).length || 1);

  if (view === 'new-fourn') return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <button className="text-sm text-gray-500 hover:underline" onClick={() => setView('liste')}>← Retour</button>
      <h2 className="text-lg font-bold text-gray-900">Nouveau fournisseur</h2>
      <div className="db-panel space-y-4">
        {[
          { key: 'nom', label: 'Nom *', placeholder: 'ACME SAS' },
          { key: 'activite', label: 'Activité', placeholder: 'Fourniture EPI' },
          { key: 'contact_nom', label: 'Contact', placeholder: 'Jean Dupont' },
          { key: 'contact_email', label: 'Email', placeholder: 'jean@acme.fr' },
          { key: 'contact_tel', label: 'Téléphone', placeholder: '01 23 45 67 89' },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
            <input className="db-input" placeholder={placeholder} value={(fourn as Record<string, string | null>)[key] ?? ''} onChange={e => setFourn(f => ({ ...f, [key]: e.target.value || null }))} />
          </div>
        ))}
        <button className="db-btn-primary" onClick={saveFournisseur} disabled={saving || !fourn.nom}>{saving ? 'Enregistrement…' : 'Créer'}</button>
      </div>
    </div>
  );

  if (view === 'new-eval' && selected) return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <button className="text-sm text-gray-500 hover:underline" onClick={() => setView('detail')}>← Retour</button>
      <h2 className="text-lg font-bold text-gray-900">Évaluation — {selected.nom}</h2>
      <div className="db-panel space-y-4">
        {CRITERES.map(({ key, label }) => (
          <div key={key}>
            <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setEvalForm(f => ({ ...f, [key]: n }))}
                  className={`h-10 w-10 rounded-full text-sm font-bold transition-all ${evalForm[key] === n ? NOTE_COLORS[n] + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Évaluateur</label>
          <input className="db-input" value={evalForm.evaluateur} onChange={e => setEvalForm(f => ({ ...f, evaluateur: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Commentaire</label>
          <textarea className="db-input" rows={3} value={evalForm.commentaire} onChange={e => setEvalForm(f => ({ ...f, commentaire: e.target.value }))} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Note calculée : <strong>{((evalForm.note_qualite + evalForm.note_delais + evalForm.note_securite + evalForm.note_prix + evalForm.note_service) / 5).toFixed(1)} / 5</strong></span>
          <button className="db-btn-primary" onClick={saveEvaluation} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </div>
    </div>
  );

  if (view === 'detail' && selected) return (
    <div className="space-y-4 p-6">
      <button className="text-sm text-gray-500 hover:underline" onClick={() => setView('liste')}>← Retour à la liste</button>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{selected.nom}</h2>
          <p className="text-sm text-gray-500">{selected.activite ?? '—'}</p>
        </div>
        {canWrite && (
          <button className="db-btn-primary" onClick={() => { setEvalForm({ ...EVAL_INIT }); setView('new-eval'); }}>
            + Nouvelle évaluation
          </button>
        )}
      </div>
      <div className="db-panel overflow-x-auto p-0">
        {evalsDeFourn.length === 0 ? (
          <div className="p-6 text-center text-gray-400">Aucune évaluation pour ce fournisseur.</div>
        ) : (
          <table className="db-table">
            <thead>
              <tr>
                <th>Date</th>
                {CRITERES.map(c => <th key={c.key}>{c.label}</th>)}
                <th>Globale</th>
                <th>Évaluateur</th>
              </tr>
            </thead>
            <tbody>
              {evalsDeFourn.map(e => (
                <tr key={e.id}>
                  <td>{new Date(e.date_evaluation).toLocaleDateString('fr-FR')}</td>
                  {CRITERES.map(c => (
                    <td key={c.key}>
                      <span className={`rounded px-2 py-0.5 text-xs font-bold ${NOTE_COLORS[e[c.key]]}`}>{e[c.key]}/5</span>
                    </td>
                  ))}
                  <td><span className={`rounded px-2 py-0.5 text-sm font-bold ${NOTE_COLORS[Math.round(e.note_globale)]}`}>{safeNumber(e.note_globale, 0).toFixed(1)}/5</span></td>
                  <td className="text-sm text-gray-500">{e.evaluateur ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 p-6">
      <div className="db-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fournisseurs</h1>
          <p className="text-sm text-gray-500">Évaluation et suivi des fournisseurs</p>
        </div>
        {canWrite && (
          <button className="db-btn-primary" onClick={() => { setFourn({ ...FOURN_INIT }); setView('new-fourn'); }}>
            + Fournisseur
          </button>
        )}
      </div>

      <div className="flex gap-4">
        <div className="db-kpi"><div className="text-2xl font-bold text-gray-900">{fournisseurs.filter(f => f.statut === 'actif').length}</div><div className="text-xs text-gray-500">Actifs</div></div>
        <div className="db-kpi"><div className="text-2xl font-bold text-gray-900">{isNaN(avgNote) ? '—' : avgNote.toFixed(1)}/5</div><div className="text-xs text-gray-500">Note moy.</div></div>
      </div>

      <div className="flex gap-2">
        {['actif', 'suspendu', 'archivé', ''].map(s => (
          <button key={s} onClick={() => setFilterStatut(s)} className={`rounded px-3 py-1 text-xs font-medium ${filterStatut === s ? 'bg-mase-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s || 'Tous'}
          </button>
        ))}
      </div>

      <div className="db-panel overflow-x-auto p-0">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-gray-400">Aucun fournisseur.</div>
        ) : (
          <table className="db-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Activité</th>
                <th>Statut</th>
                <th>Note</th>
                <th>Dernière éval.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} className="cursor-pointer hover:bg-gray-50" onClick={() => { setSelected(f); setView('detail'); }}>
                  <td className="font-medium text-gray-900">{f.nom}</td>
                  <td className="text-sm text-gray-600">{f.activite ?? '—'}</td>
                  <td><span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUT_COLORS[f.statut]}`}>{f.statut}</span></td>
                  <td>
                    {f.note_globale !== null
                      ? <span className={`rounded px-2 py-0.5 text-sm font-bold ${NOTE_COLORS[Math.round(f.note_globale)]}`}>{f.note_globale.toFixed(1)}/5</span>
                      : <span className="text-gray-400 text-xs">Non évalué</span>}
                  </td>
                  <td className="text-sm text-gray-500">{f.derniere_eval ? new Date(f.derniere_eval).toLocaleDateString('fr-FR') : '—'}</td>
                  <td onClick={e => e.stopPropagation()}>
                    {canWrite && (
                      <button className="text-xs text-gray-400 hover:text-gray-700" onClick={() => toggleStatut(f)}>
                        Changer statut
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Commit**

```powershell
git add src/dashboard/FournisseursEvaluation.tsx
git commit -m "feat(v2): composant FournisseursEvaluation (liste + grille notation)"
```

---

### Task 2 : Page wrapper + routing + sidebar

**Files :**
- Create : `src/pages/DashboardFournisseursPage.tsx`
- Modify : `src/main.tsx`
- Modify : `src/components/dashboard/DashboardSidebar.tsx`

- [ ] **Step 1 : Créer la page wrapper**

```tsx
// src/pages/DashboardFournisseursPage.tsx
import type { Session } from '@supabase/supabase-js';
import DashboardGuard from '../components/dashboard/DashboardGuard';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import FournisseursEvaluation from '../dashboard/FournisseursEvaluation';
import { useCompany } from '../hooks/useCompany';

interface Props { session: Session | null }

function FournisseursContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return (
    <DashboardLayout company={company} membership={membership}>
      <FournisseursEvaluation companyId={company.id} canWrite={canWrite} />
    </DashboardLayout>
  );
}

export default function DashboardFournisseursPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <FournisseursContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] **Step 2 : Ajouter dans `src/main.tsx`**

Ajouter l'import :
```tsx
import DashboardFournisseursPage from './pages/DashboardFournisseursPage';
```

Ajouter la route :
```tsx
<Route path="/dashboard/fournisseurs" element={<DashboardFournisseursPage session={session} />} />
```

- [ ] **Step 3 : Ajouter dans `src/components/dashboard/DashboardSidebar.tsx`**

Dans le groupe `Qualité / RH`, ajouter après "Réunions QHSE" :
```tsx
{ path: '/dashboard/fournisseurs', label: 'Fournisseurs', icon: '🤝' },
```

- [ ] **Step 4 : Vérifier la compilation**

```powershell
npx tsc --noEmit
```
Résultat attendu : aucune erreur

- [ ] **Step 5 : Commit final**

```powershell
git add src/pages/DashboardFournisseursPage.tsx src/main.tsx src/components/dashboard/DashboardSidebar.tsx
git commit -m "feat(v2): route /dashboard/fournisseurs + sidebar"
```
