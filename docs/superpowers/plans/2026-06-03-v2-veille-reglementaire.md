# Veille Réglementaire — Plan d'implémentation V2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un module de veille réglementaire permettant de recenser les textes applicables (lois, décrets, normes, référentiels MASE) avec leur statut de conformité et les actions requises.

**Architecture:** Table `textes_reglementaires` avec les champs clés (référence, domaine, statut de conformité, échéance, actions). Composant React CRUD avec filtres par domaine/statut et alertes sur les échéances proches. Ajouté dans le groupe "Environnement" de la sidebar (créé par le plan Environnement).

**Tech Stack:** React 19 + TypeScript, Supabase PostgreSQL, Tailwind CSS, classes `.db-*`, `diffJours` de `kpi-utils`

---

### Task 0 : Migration SQL

**Files :**
- Create : `supabase/migrations/20260604000007_veille_reglementaire.sql`

- [ ] **Step 1 : Créer la migration**

```sql
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
```

- [ ] **Step 2 : Appliquer**

```powershell
npx supabase db push
```
Résultat attendu : `Applying migration 20260604000007_veille_reglementaire.sql... done`

- [ ] **Step 3 : Commit**

```powershell
git add supabase/migrations/20260604000007_veille_reglementaire.sql
git commit -m "feat(v2): migration SQL veille réglementaire"
```

---

### Task 1 : Composant VeilleReglementaire

**Files :**
- Create : `src/dashboard/VeilleReglementaire.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
// src/dashboard/VeilleReglementaire.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { diffJours } from './kpi-utils';

interface Texte {
  id: string;
  reference: string;
  titre: string;
  domaine: string;
  type_texte: string;
  date_parution: string | null;
  date_echeance: string | null;
  statut_conformite: 'conforme' | 'en_cours' | 'non_conforme' | 'sans_objet';
  actions_requises: string | null;
  responsable: string | null;
  notes: string | null;
  lien_url: string | null;
}

const DOMAINES = ['Sécurité', 'Environnement', 'Travail', 'Qualité', 'MASE', 'Autre'];
const TYPES = ['Loi', 'Décret', 'Arrêté', 'Norme', 'Circulaire', 'Référentiel', 'Autre'];
const STATUTS = ['conforme', 'en_cours', 'non_conforme', 'sans_objet'] as const;

const STATUT_CONFIG: Record<string, { label: string; cls: string }> = {
  conforme:      { label: 'Conforme', cls: 'bg-green-100 text-green-700' },
  en_cours:      { label: 'En cours', cls: 'bg-yellow-100 text-yellow-700' },
  non_conforme:  { label: 'Non conforme', cls: 'bg-red-100 text-red-700' },
  sans_objet:    { label: 'Sans objet', cls: 'bg-gray-100 text-gray-500' },
};

const EMPTY: Omit<Texte, 'id'> = {
  reference: '', titre: '', domaine: 'Sécurité', type_texte: 'Loi',
  date_parution: null, date_echeance: null, statut_conformite: 'en_cours',
  actions_requises: null, responsable: null, notes: null, lien_url: null,
};

interface Props { companyId: string; canWrite: boolean }

export default function VeilleReglementaire({ companyId, canWrite }: Props) {
  const [textes, setTextes] = useState<Texte[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [filterDomaine, setFilterDomaine] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('textes_reglementaires')
      .select('*')
      .eq('company_id', companyId)
      .order('domaine')
      .order('reference');
    setTextes((data ?? []) as Texte[]);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  function startEdit(t: Texte) {
    const { id, ...rest } = t;
    setForm(rest);
    setEditId(id);
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    if (editId) {
      await supabase.from('textes_reglementaires').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editId);
    } else {
      await supabase.from('textes_reglementaires').insert({ ...form, company_id: companyId });
    }
    await load();
    setShowForm(false);
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce texte ?')) return;
    await supabase.from('textes_reglementaires').delete().eq('id', id);
    await load();
  }

  function getEcheanceAlert(date: string | null): string {
    if (!date) return '';
    const j = diffJours(new Date(date), new Date());
    if (j < 0) return 'text-red-600 font-semibold';
    if (j <= 30) return 'text-orange-600 font-semibold';
    if (j <= 90) return 'text-yellow-600';
    return 'text-gray-600';
  }

  function echeanceLabel(date: string | null): string {
    if (!date) return '—';
    const j = diffJours(new Date(date), new Date());
    const dateStr = new Date(date).toLocaleDateString('fr-FR');
    if (j < 0) return `${dateStr} (dépassée de ${Math.abs(j)}j)`;
    if (j === 0) return `${dateStr} (aujourd'hui)`;
    if (j <= 30) return `${dateStr} (dans ${j}j !)`;
    return dateStr;
  }

  let filtered = textes;
  if (filterDomaine) filtered = filtered.filter(t => t.domaine === filterDomaine);
  if (filterStatut) filtered = filtered.filter(t => t.statut_conformite === filterStatut);

  const alertes = textes.filter(t => {
    if (!t.date_echeance || t.statut_conformite === 'conforme' || t.statut_conformite === 'sans_objet') return false;
    return diffJours(new Date(t.date_echeance), new Date()) <= 60;
  });

  if (showForm) return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <button className="text-sm text-gray-500 hover:underline" onClick={() => setShowForm(false)}>← Retour</button>
      <h2 className="text-lg font-bold text-gray-900">{editId ? 'Modifier le texte' : 'Nouveau texte réglementaire'}</h2>
      <div className="db-panel space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Référence *</label>
            <input className="db-input" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Ex : Code du travail R4323-1" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
            <select className="db-input" value={form.type_texte} onChange={e => setForm(f => ({ ...f, type_texte: e.target.value }))}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Titre *</label>
            <input className="db-input" value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} placeholder="Intitulé du texte" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Domaine</label>
            <select className="db-input" value={form.domaine} onChange={e => setForm(f => ({ ...f, domaine: e.target.value }))}>
              {DOMAINES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Statut de conformité</label>
            <select className="db-input" value={form.statut_conformite} onChange={e => setForm(f => ({ ...f, statut_conformite: e.target.value as Texte['statut_conformite'] }))}>
              {STATUTS.map(s => <option key={s} value={s}>{STATUT_CONFIG[s].label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date de parution</label>
            <input type="date" className="db-input" value={form.date_parution ?? ''} onChange={e => setForm(f => ({ ...f, date_parution: e.target.value || null }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Échéance de mise en conformité</label>
            <input type="date" className="db-input" value={form.date_echeance ?? ''} onChange={e => setForm(f => ({ ...f, date_echeance: e.target.value || null }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Responsable</label>
            <input className="db-input" value={form.responsable ?? ''} onChange={e => setForm(f => ({ ...f, responsable: e.target.value || null }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Lien vers le texte</label>
            <input className="db-input" value={form.lien_url ?? ''} onChange={e => setForm(f => ({ ...f, lien_url: e.target.value || null }))} placeholder="https://legifrance.gouv.fr/..." />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Actions requises</label>
            <textarea className="db-input" rows={2} value={form.actions_requises ?? ''} onChange={e => setForm(f => ({ ...f, actions_requises: e.target.value || null }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
            <textarea className="db-input" rows={2} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value || null }))} />
          </div>
        </div>
        <button className="db-btn-primary" onClick={save} disabled={saving || !form.reference || !form.titre}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 p-6">
      <div className="db-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Veille Réglementaire</h1>
          <p className="text-sm text-gray-500">Textes applicables, conformité et échéances</p>
        </div>
        {canWrite && <button className="db-btn-primary" onClick={() => { setForm({ ...EMPTY }); setEditId(null); setShowForm(true); }}>+ Texte</button>}
      </div>

      {alertes.length > 0 && (
        <div className="db-alert-amber">
          ⚠️ <strong>{alertes.length} texte(s)</strong> avec une échéance dans moins de 60 jours.
        </div>
      )}

      <div className="flex gap-4">
        {(['conforme', 'en_cours', 'non_conforme'] as const).map(s => (
          <div key={s} className="db-kpi">
            <div className={`text-2xl font-bold ${s === 'conforme' ? 'text-green-600' : s === 'en_cours' ? 'text-yellow-600' : 'text-red-600'}`}>
              {textes.filter(t => t.statut_conformite === s).length}
            </div>
            <div className="text-xs text-gray-500">{STATUT_CONFIG[s].label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <select className="db-input w-auto" value={filterDomaine} onChange={e => setFilterDomaine(e.target.value)}>
          <option value="">Tous les domaines</option>
          {DOMAINES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="db-input w-auto" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {STATUTS.map(s => <option key={s} value={s}>{STATUT_CONFIG[s].label}</option>)}
        </select>
      </div>

      <div className="db-panel overflow-x-auto p-0">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Aucun texte réglementaire enregistré.</div>
        ) : (
          <table className="db-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Titre</th>
                <th>Domaine</th>
                <th>Statut</th>
                <th>Échéance</th>
                <th>Responsable</th>
                {canWrite && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td className="font-mono text-xs text-gray-700">
                    {t.lien_url ? <a href={t.lien_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{t.reference}</a> : t.reference}
                  </td>
                  <td className="max-w-xs truncate text-sm text-gray-900" title={t.titre}>{t.titre}</td>
                  <td className="text-sm text-gray-600">{t.domaine}</td>
                  <td><span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUT_CONFIG[t.statut_conformite].cls}`}>{STATUT_CONFIG[t.statut_conformite].label}</span></td>
                  <td className={`text-xs ${getEcheanceAlert(t.date_echeance)}`}>{echeanceLabel(t.date_echeance)}</td>
                  <td className="text-sm text-gray-500">{t.responsable ?? '—'}</td>
                  {canWrite && (
                    <td className="flex gap-2">
                      <button className="text-xs text-blue-600 hover:underline" onClick={() => startEdit(t)}>Modifier</button>
                      <button className="text-xs text-red-500 hover:underline" onClick={() => remove(t.id)}>Suppr.</button>
                    </td>
                  )}
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
git add src/dashboard/VeilleReglementaire.tsx
git commit -m "feat(v2): composant VeilleReglementaire (textes + conformité + alertes échéances)"
```

---

### Task 2 : Page wrapper + routing + sidebar

**Files :**
- Create : `src/pages/DashboardVeillePage.tsx`
- Modify : `src/main.tsx`
- Modify : `src/components/dashboard/DashboardSidebar.tsx`

- [ ] **Step 1 : Créer la page wrapper**

```tsx
// src/pages/DashboardVeillePage.tsx
import type { Session } from '@supabase/supabase-js';
import DashboardGuard from '../components/dashboard/DashboardGuard';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import VeilleReglementaire from '../dashboard/VeilleReglementaire';
import { useCompany } from '../hooks/useCompany';

interface Props { session: Session | null }

function VeilleContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return (
    <DashboardLayout company={company} membership={membership}>
      <VeilleReglementaire companyId={company.id} canWrite={canWrite} />
    </DashboardLayout>
  );
}

export default function DashboardVeillePage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <VeilleContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] **Step 2 : Ajouter dans `src/main.tsx`**

Ajouter l'import :
```tsx
import DashboardVeillePage from './pages/DashboardVeillePage';
```

Ajouter la route :
```tsx
<Route path="/dashboard/veille" element={<DashboardVeillePage session={session} />} />
```

- [ ] **Step 3 : Ajouter dans `src/components/dashboard/DashboardSidebar.tsx`**

Dans le groupe `Environnement` (créé par le plan Environnement), ajouter :
```tsx
{ path: '/dashboard/veille', label: 'Veille Réglementaire', icon: '📜' },
```

Le groupe complet sera :
```tsx
{
  label: 'Environnement',
  items: [
    { path: '/dashboard/environnement', label: 'Suivi Environnemental', icon: '🌱' },
    { path: '/dashboard/veille', label: 'Veille Réglementaire', icon: '📜' },
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
git add src/pages/DashboardVeillePage.tsx src/main.tsx src/components/dashboard/DashboardSidebar.tsx
git commit -m "feat(v2): route /dashboard/veille + sidebar groupe Environnement"
```
