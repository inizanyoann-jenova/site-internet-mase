# Recherche Globale — Plan d'implémentation V2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une recherche globale permettant de trouver un enregistrement dans toutes les tables du dashboard (risques, actions, accidents, habilitations, fournisseurs, etc.) depuis une barre de recherche unique.

**Architecture:** Pas de nouvelle table. Recherche côté serveur via des requêtes Supabase parallèles avec `.ilike()` sur les colonnes textuelles clés de chaque table. Résultats regroupés par module avec liens vers les pages concernées. Composant React avec debounce (300ms) pour ne pas surcharger la DB.

**Tech Stack:** React 19 + TypeScript, Supabase PostgreSQL (ILIKE), Tailwind CSS, classes `.db-*`, React Router `useNavigate`

---

### Task 0 : Index PostgreSQL pour performances (optionnel mais recommandé)

**Files :**
- Create : `supabase/migrations/20260604000009_search_indexes.sql`

- [ ] **Step 1 : Créer la migration**

```sql
-- supabase/migrations/20260604000009_search_indexes.sql
-- Index pour accélérer les recherches ILIKE (expression index sur lower())

create index if not exists idx_risques_search on risques using gin(to_tsvector('french', coalesce(danger,'') || ' ' || coalesce(unite_travail,'')));
create index if not exists idx_actions_search on actions using gin(to_tsvector('french', coalesce(action,'') || ' ' || coalesce(pilote,'')));
create index if not exists idx_accidents_search on accidents using gin(to_tsvector('french', coalesce(description_faits,'') || ' ' || coalesce(victime,'')));
create index if not exists idx_habilitations_search on habilitations (lower(employe), lower(domaine));
```

- [ ] **Step 2 : Appliquer**

```powershell
npx supabase db push
```
Résultat attendu : `Applying migration 20260604000009_search_indexes.sql... done`

- [ ] **Step 3 : Commit**

```powershell
git add supabase/migrations/20260604000009_search_indexes.sql
git commit -m "feat(v2): index PostgreSQL pour la recherche globale"
```

---

### Task 1 : Composant RechercheGlobale

**Files :**
- Create : `src/dashboard/RechercheGlobale.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
// src/dashboard/RechercheGlobale.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface SearchResult {
  module: string;
  icon: string;
  path: string;
  label: string;
  sublabel: string;
  id: string;
}

const MODULE_CONFIG: Record<string, { icon: string; path: string; label: string }> = {
  risques:               { icon: '📋', path: '/dashboard/duerp',         label: 'DUERP' },
  actions:               { icon: '✅', path: '/dashboard/actions',       label: "Plan d'actions" },
  accidents:             { icon: '🚨', path: '/dashboard/accidents',     label: 'Accidents' },
  habilitations:         { icon: '🏅', path: '/dashboard/habilitations', label: 'Habilitations' },
  objectifs_qhse:        { icon: '🎯', path: '/dashboard/objectifs',     label: 'Objectifs QHSE' },
  reunions_qhse:         { icon: '📅', path: '/dashboard/reunions',      label: 'Réunions QHSE' },
  qualite_audits:        { icon: '🔍', path: '/dashboard/audits',        label: 'Audits' },
  rh_employes:           { icon: '👥', path: '/dashboard/rh',            label: 'Social RH' },
  fournisseurs:          { icon: '🤝', path: '/dashboard/fournisseurs',  label: 'Fournisseurs' },
  textes_reglementaires: { icon: '📜', path: '/dashboard/veille',        label: 'Veille Réglementaire' },
  registre_traitements:  { icon: '🔐', path: '/dashboard/rgpd',          label: 'RGPD' },
  calendrier_qhse:       { icon: '📆', path: '/dashboard/calendrier',    label: 'Calendrier QHSE' },
};

async function searchTable(
  table: string,
  companyId: string,
  q: string,
  columns: string[],
  getLabel: (row: Record<string, unknown>) => string,
  getSublabel: (row: Record<string, unknown>) => string,
): Promise<SearchResult[]> {
  const cfg = MODULE_CONFIG[table];
  if (!cfg) return [];

  const orFilter = columns.map(c => `${c}.ilike.%${q}%`).join(',');
  const { data } = await supabase
    .from(table)
    .select(columns.join(',') + ',id')
    .eq('company_id', companyId)
    .or(orFilter)
    .limit(5);

  return (data ?? []).map(row => ({
    module: cfg.label,
    icon: cfg.icon,
    path: cfg.path,
    label: getLabel(row as Record<string, unknown>),
    sublabel: getSublabel(row as Record<string, unknown>),
    id: (row as Record<string, unknown>).id as string,
  }));
}

interface Props { companyId: string }

export default function RechercheGlobale({ companyId }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);

    const allResults = await Promise.all([
      searchTable('risques', companyId, q,
        ['danger', 'unite_travail', 'famille_risque'],
        r => String(r.danger ?? ''),
        r => String(r.unite_travail ?? ''),
      ),
      searchTable('actions', companyId, q,
        ['action', 'pilote', 'origine'],
        r => String(r.action ?? '').slice(0, 80),
        r => `Pilote : ${r.pilote ?? '—'}`,
      ),
      searchTable('accidents', companyId, q,
        ['victime', 'description_faits', 'lieu'],
        r => String(r.victime ?? String(r.description_faits ?? '').slice(0, 60)),
        r => String(r.lieu ?? ''),
      ),
      searchTable('habilitations', companyId, q,
        ['employe', 'domaine'],
        r => String(r.employe ?? ''),
        r => String(r.domaine ?? ''),
      ),
      searchTable('rh_employes', companyId, q,
        ['nom', 'prenom', 'poste'],
        r => `${r.prenom ?? ''} ${r.nom ?? ''}`.trim(),
        r => String(r.poste ?? ''),
      ),
      searchTable('fournisseurs', companyId, q,
        ['nom', 'activite', 'contact_nom'],
        r => String(r.nom ?? ''),
        r => String(r.activite ?? ''),
      ),
      searchTable('textes_reglementaires', companyId, q,
        ['reference', 'titre', 'domaine'],
        r => String(r.titre ?? ''),
        r => String(r.reference ?? ''),
      ),
      searchTable('registre_traitements', companyId, q,
        ['nom_traitement', 'finalite'],
        r => String(r.nom_traitement ?? ''),
        r => String(r.finalite ?? '').slice(0, 60),
      ),
      searchTable('calendrier_qhse', companyId, q,
        ['titre', 'responsable', 'lieu'],
        r => String(r.titre ?? ''),
        r => String(r.lieu ?? ''),
      ),
      searchTable('reunions_qhse', companyId, q,
        ['ordre_du_jour', 'lieu'],
        r => String(r.ordre_du_jour ?? '').slice(0, 60),
        r => String(r.lieu ?? ''),
      ),
    ]);

    setResults(allResults.flat().slice(0, 30));
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.module]) acc[r.module] = [];
    acc[r.module].push(r);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="db-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Recherche globale</h1>
          <p className="text-sm text-gray-500">Chercher dans tous les modules du dashboard</p>
        </div>
      </div>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          className="db-input pl-9 text-base"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher un risque, une action, un employé, un fournisseur…"
          autoFocus
        />
        {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Recherche…</span>}
      </div>

      {searched && results.length === 0 && !loading && (
        <div className="db-panel p-8 text-center text-gray-400">
          Aucun résultat pour « {query} »
        </div>
      )}

      {!searched && (
        <div className="db-panel p-6 text-center text-gray-400 text-sm">
          Commencer à taper pour rechercher dans tous les modules (min. 2 caractères)
        </div>
      )}

      {Object.entries(grouped).map(([module, items]) => (
        <div key={module}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">{items[0].icon} {module}</h3>
          <div className="space-y-1">
            {items.map(item => (
              <button
                key={item.id}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-mase-green hover:bg-green-50"
                onClick={() => navigate(item.path)}
              >
                <div className="font-medium text-gray-900">{item.label || '—'}</div>
                {item.sublabel && <div className="text-xs text-gray-500">{item.sublabel}</div>}
              </button>
            ))}
          </div>
        </div>
      ))}

      {results.length >= 30 && (
        <p className="text-center text-xs text-gray-400">Affichage limité à 30 résultats — affinez votre recherche</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : Commit**

```powershell
git add src/dashboard/RechercheGlobale.tsx
git commit -m "feat(v2): composant RechercheGlobale (ILIKE multi-tables, debounce)"
```

---

### Task 2 : Page wrapper + routing + sidebar

**Files :**
- Create : `src/pages/DashboardRecherchePage.tsx`
- Modify : `src/main.tsx`
- Modify : `src/components/dashboard/DashboardSidebar.tsx`

- [ ] **Step 1 : Créer la page wrapper**

```tsx
// src/pages/DashboardRecherchePage.tsx
import type { Session } from '@supabase/supabase-js';
import DashboardGuard from '../components/dashboard/DashboardGuard';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import RechercheGlobale from '../dashboard/RechercheGlobale';
import { useCompany } from '../hooks/useCompany';

interface Props { session: Session | null }

function RechercheContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  return (
    <DashboardLayout company={company} membership={membership}>
      <RechercheGlobale companyId={company.id} />
    </DashboardLayout>
  );
}

export default function DashboardRecherchePage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <RechercheContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] **Step 2 : Ajouter dans `src/main.tsx`**

Ajouter l'import :
```tsx
import DashboardRecherchePage from './pages/DashboardRecherchePage';
```

Ajouter la route :
```tsx
<Route path="/dashboard/recherche" element={<DashboardRecherchePage session={session} />} />
```

- [ ] **Step 3 : Ajouter dans `src/components/dashboard/DashboardSidebar.tsx`**

Dans le groupe `Pilotage`, ajouter en dernier item :
```tsx
{ path: '/dashboard/recherche', label: 'Recherche', icon: '🔍' },
```

- [ ] **Step 4 : Vérifier la compilation**

```powershell
npx tsc --noEmit
```
Résultat attendu : aucune erreur

- [ ] **Step 5 : Commit final**

```powershell
git add src/pages/DashboardRecherchePage.tsx src/main.tsx src/components/dashboard/DashboardSidebar.tsx
git commit -m "feat(v2): route /dashboard/recherche + sidebar"
```
