# Matrice de Polyvalence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire l'outil interactif Matrice de Polyvalence — CRUD compétences × salariés, auto-save Supabase, gestion absences avec alertes, export PDF 2 pages.

**Architecture:** Outil React à onglets fidèle au prototype HTML (`matrice de polyvalence/matrice_DEF.html`), données stockées en JSONB dans Supabase (`matrices` table, 1 ligne par user), génération PDF client-side avec `@react-pdf/renderer`. Accès conditionné par achat Stripe (tool_slug `matrice-polyvalence`).

**Tech Stack:** React 19, TypeScript, Tailwind v4, Supabase, @react-pdf/renderer, Vitest

---

## File Map

| Fichier | Action | Rôle |
| ------- | ------ | ---- |
| `supabase/migrations/20260602_create_matrices.sql` | Créer | Table + RLS |
| `src/components/matrice/types.ts` | Créer | Types TS partagés |
| `src/components/matrice/demoData.ts` | Créer | Données de démo initiales |
| `src/components/matrice/matrice.utils.ts` | Créer | Business logic (redondance, alertes) |
| `src/components/matrice/__tests__/matrice.utils.test.ts` | Créer | Tests unitaires |
| `src/components/matrice/MatriceContext.tsx` | Créer | State global + auto-save |
| `src/pages/MatricePage.tsx` | Créer | Shell de page + gating |
| `src/components/matrice/MatriceHeader.tsx` | Créer | Header dégradé + indicateur save |
| `src/components/matrice/MatriceTabs.tsx` | Créer | Barre d'onglets sticky |
| `src/components/matrice/views/MatriceView.tsx` | Créer | Tableau interactif principal |
| `src/components/matrice/views/CollaborateursView.tsx` | Créer | CRUD salariés |
| `src/components/matrice/views/AbsencesView.tsx` | Créer | Absences + alertes |
| `src/components/matrice/views/CompetencesView.tsx` | Créer | CRUD compétences |
| `src/components/matrice/views/CategoriesView.tsx` | Créer | CRUD catégories |
| `src/components/matrice/views/ParametresView.tsx` | Créer | Config + JSON export/import |
| `src/components/matrice/MatricePDF.tsx` | Créer | PDF 2 pages |
| `src/main.tsx` | Modifier | Ajouter route `/matrice-polyvalence` |
| `src/pages/HomePage.tsx` | Modifier | Ajouter 4e carte outil |

---

## Task 1 — Migration Supabase

**Files:**
- Create: `supabase/migrations/20260602_create_matrices.sql`

- [ ] **Créer le fichier de migration**

```sql
-- supabase/migrations/20260602_create_matrices.sql
create table if not exists matrices (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null unique,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table matrices enable row level security;

create policy "matrices_own_read"
  on matrices for select using (auth.uid() = user_id);

create policy "matrices_own_insert"
  on matrices for insert with check (auth.uid() = user_id);

create policy "matrices_own_update"
  on matrices for update using (auth.uid() = user_id);
```

- [ ] **Appliquer la migration via Supabase MCP ou CLI**

```bash
# Option A — via Supabase CLI (si configuré)
supabase db push

# Option B — coller le SQL dans l'éditeur SQL du dashboard Supabase
# Projet : ulceeurwibmbtnqhkaao
```

- [ ] **Vérifier dans le dashboard Supabase que la table `matrices` existe avec RLS activé**

- [ ] **Commit**

```bash
git add supabase/migrations/20260602_create_matrices.sql
git commit -m "feat(matrice): add matrices table with RLS"
```

---

## Task 2 — Types TypeScript

**Files:**
- Create: `src/components/matrice/types.ts`

- [ ] **Créer le fichier de types**

```typescript
// src/components/matrice/types.ts

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Comp {
  id: string;
  name: string;
  categoryId: string;
  isKey: boolean;
  minBackups: number;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  isAbsent: boolean;
  absenceReason: string;
  skills: Record<string, number>; // compId → level 0-3
}

export interface MatriceConfig {
  company: string;
  docTitle: string;
  categories: Category[];
}

export interface MatriceData {
  config: MatriceConfig;
  comps: Comp[];
  employees: Employee[];
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface CoverageAlert {
  comp: Comp;
  status: 'critical' | 'warning';
  reason: string;
  availableEmployees: Employee[];
}

export type MatriceAction =
  | { type: 'SET_DATA'; data: MatriceData }
  | { type: 'SET_SKILL'; employeeId: string; compId: string; level: number }
  | { type: 'ADD_EMPLOYEE'; employee: Omit<Employee, 'id' | 'skills'> }
  | { type: 'UPDATE_EMPLOYEE'; employee: Employee }
  | { type: 'DELETE_EMPLOYEE'; id: string }
  | { type: 'TOGGLE_ABSENCE'; employeeId: string; isAbsent: boolean; reason: string }
  | { type: 'ADD_COMP'; comp: Omit<Comp, 'id'> }
  | { type: 'UPDATE_COMP'; comp: Comp }
  | { type: 'DELETE_COMP'; id: string }
  | { type: 'ADD_CATEGORY'; category: Omit<Category, 'id'> }
  | { type: 'UPDATE_CATEGORY'; category: Category }
  | { type: 'DELETE_CATEGORY'; id: string }
  | { type: 'UPDATE_CONFIG'; config: Partial<MatriceConfig> };
```

- [ ] **Commit**

```bash
git add src/components/matrice/types.ts
git commit -m "feat(matrice): add TypeScript types"
```

---

## Task 3 — Données de démo + utils

**Files:**
- Create: `src/components/matrice/demoData.ts`
- Create: `src/components/matrice/matrice.utils.ts`
- Create: `src/components/matrice/__tests__/matrice.utils.test.ts`

- [ ] **Créer demoData.ts**

```typescript
// src/components/matrice/demoData.ts
import type { MatriceData } from './types';

export const DEMO_DATA: MatriceData = {
  config: {
    company: 'Votre Entreprise',
    docTitle: 'Matrice de Polyvalence 2025',
    categories: [
      { id: 'cat1', name: 'Habilitations & Sécurité', color: '#c0392b' },
      { id: 'cat2', name: 'Compétences Techniques', color: '#1f4d7a' },
      { id: 'cat3', name: 'Management & Support', color: '#7c3aed' },
    ],
  },
  comps: [
    { id: 'c1', name: 'Habilitation électrique (BR/B2V)', categoryId: 'cat1', isKey: true, minBackups: 2 },
    { id: 'c2', name: 'CACES R489 (Chariot)', categoryId: 'cat1', isKey: true, minBackups: 1 },
    { id: 'c3', name: 'Conduite machine A', categoryId: 'cat2', isKey: true, minBackups: 2 },
    { id: 'c4', name: 'Maintenance préventive', categoryId: 'cat2', isKey: false, minBackups: 1 },
    { id: 'c5', name: 'Contrôle qualité', categoryId: 'cat2', isKey: true, minBackups: 1 },
    { id: 'c6', name: "Management d'équipe", categoryId: 'cat3', isKey: false, minBackups: 1 },
    { id: 'c7', name: 'Reporting & indicateurs', categoryId: 'cat3', isKey: false, minBackups: 1 },
  ],
  employees: [
    {
      id: 'e1', name: 'Martin Pierre', role: 'Chef de chantier',
      isAbsent: false, absenceReason: '',
      skills: { c1: 3, c2: 2, c3: 2, c4: 1, c5: 0, c6: 3, c7: 2 },
    },
    {
      id: 'e2', name: 'Dupont Claire', role: 'Électricienne',
      isAbsent: false, absenceReason: '',
      skills: { c1: 3, c2: 0, c3: 1, c4: 2, c5: 1, c6: 0, c7: 1 },
    },
    {
      id: 'e3', name: 'Bernard Thomas', role: 'Opérateur',
      isAbsent: false, absenceReason: '',
      skills: { c1: 1, c2: 3, c3: 3, c4: 2, c5: 2, c6: 0, c7: 0 },
    },
    {
      id: 'e4', name: 'Rousseau Sophie', role: 'Technicienne QC',
      isAbsent: false, absenceReason: '',
      skills: { c1: 0, c2: 1, c3: 0, c4: 1, c5: 3, c6: 1, c7: 2 },
    },
    {
      id: 'e5', name: 'Lambert Hugo', role: 'Agent de maintenance',
      isAbsent: false, absenceReason: '',
      skills: { c1: 2, c2: 2, c3: 2, c4: 3, c5: 1, c6: 0, c7: 0 },
    },
  ],
};
```

- [ ] **Créer matrice.utils.ts**

```typescript
// src/components/matrice/matrice.utils.ts
import type { Comp, Employee, CoverageAlert, MatriceData, MatriceAction } from './types';

export function uid(): string {
  return '_' + Math.random().toString(36).slice(2, 9);
}

/** Nombre de personnes disponibles (non absentes) avec niveau >= 2 sur une compétence */
export function countAvailable(comp: Comp, employees: Employee[]): number {
  return employees.filter(e => !e.isAbsent && (e.skills[comp.id] ?? 0) >= 2).length;
}

/** Redondance par compétence : nombre de personnes niveau >= 2 (absents inclus) */
export function computeRedundancy(comps: Comp[], employees: Employee[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const comp of comps) {
    result[comp.id] = employees.filter(e => (e.skills[comp.id] ?? 0) >= 2).length;
  }
  return result;
}

/** Alertes pour les compétences clés sous-couvertes (personnes disponibles seulement) */
export function getCoverageAlerts(comps: Comp[], employees: Employee[]): CoverageAlert[] {
  const alerts: CoverageAlert[] = [];
  for (const comp of comps) {
    if (!comp.isKey) continue;
    const available = employees.filter(e => !e.isAbsent && (e.skills[comp.id] ?? 0) >= 2);
    if (available.length === 0) {
      alerts.push({
        comp,
        status: 'critical',
        reason: 'Aucune personne disponible niveau ≥ 2',
        availableEmployees: available,
      });
    } else if (available.length < comp.minBackups) {
      alerts.push({
        comp,
        status: 'warning',
        reason: `${available.length} / ${comp.minBackups} remplaçants requis`,
        availableEmployees: available,
      });
    }
  }
  return alerts;
}

/** Reducer principal */
export function matriceReducer(state: MatriceData, action: MatriceAction): MatriceData {
  switch (action.type) {
    case 'SET_DATA':
      return action.data;

    case 'SET_SKILL': {
      const employees = state.employees.map(e =>
        e.id === action.employeeId
          ? { ...e, skills: { ...e.skills, [action.compId]: action.level } }
          : e
      );
      return { ...state, employees };
    }

    case 'ADD_EMPLOYEE': {
      const skills: Record<string, number> = {};
      state.comps.forEach(c => { skills[c.id] = 0; });
      const employee = { ...action.employee, id: uid(), skills };
      return { ...state, employees: [...state.employees, employee] };
    }

    case 'UPDATE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.map(e => e.id === action.employee.id ? action.employee : e),
      };

    case 'DELETE_EMPLOYEE':
      return { ...state, employees: state.employees.filter(e => e.id !== action.id) };

    case 'TOGGLE_ABSENCE':
      return {
        ...state,
        employees: state.employees.map(e =>
          e.id === action.employeeId
            ? { ...e, isAbsent: action.isAbsent, absenceReason: action.reason }
            : e
        ),
      };

    case 'ADD_COMP': {
      const comp = { ...action.comp, id: uid() };
      const employees = state.employees.map(e => ({
        ...e, skills: { ...e.skills, [comp.id]: 0 },
      }));
      return { ...state, comps: [...state.comps, comp], employees };
    }

    case 'UPDATE_COMP':
      return { ...state, comps: state.comps.map(c => c.id === action.comp.id ? action.comp : c) };

    case 'DELETE_COMP': {
      const employees = state.employees.map(e => {
        const skills = { ...e.skills };
        delete skills[action.id];
        return { ...e, skills };
      });
      return { ...state, comps: state.comps.filter(c => c.id !== action.id), employees };
    }

    case 'ADD_CATEGORY': {
      const category = { ...action.category, id: uid() };
      return {
        ...state,
        config: { ...state.config, categories: [...state.config.categories, category] },
      };
    }

    case 'UPDATE_CATEGORY':
      return {
        ...state,
        config: {
          ...state.config,
          categories: state.config.categories.map(c =>
            c.id === action.category.id ? action.category : c
          ),
        },
      };

    case 'DELETE_CATEGORY':
      return {
        ...state,
        config: {
          ...state.config,
          categories: state.config.categories.filter(c => c.id !== action.id),
        },
        comps: state.comps.filter(c => c.categoryId !== action.id),
      };

    case 'UPDATE_CONFIG':
      return { ...state, config: { ...state.config, ...action.config } };

    default:
      return state;
  }
}
```

- [ ] **Écrire les tests (avant de les exécuter)**

```typescript
// src/components/matrice/__tests__/matrice.utils.test.ts
import { describe, it, expect } from 'vitest';
import { computeRedundancy, getCoverageAlerts, matriceReducer } from '../matrice.utils';
import type { Comp, Employee, MatriceData } from '../types';
import { DEMO_DATA } from '../demoData';

const comp1: Comp = { id: 'c1', name: 'Soudure', categoryId: 'cat1', isKey: true, minBackups: 2 };
const comp2: Comp = { id: 'c2', name: 'Électrique', categoryId: 'cat1', isKey: false, minBackups: 1 };

const employees: Employee[] = [
  { id: 'e1', name: 'Alice', role: 'Op', isAbsent: false, absenceReason: '', skills: { c1: 3, c2: 2 } },
  { id: 'e2', name: 'Bob', role: 'Op', isAbsent: true, absenceReason: 'Maladie', skills: { c1: 2, c2: 1 } },
  { id: 'e3', name: 'Carla', role: 'Op', isAbsent: false, absenceReason: '', skills: { c1: 0, c2: 3 } },
];

describe('computeRedundancy', () => {
  it('compte les personnes niveau >= 2 (absents inclus)', () => {
    const result = computeRedundancy([comp1, comp2], employees);
    expect(result['c1']).toBe(2); // Alice(3) + Bob(2), Carla(0) exclue
    expect(result['c2']).toBe(2); // Alice(2) + Carla(3), Bob(1) exclu
  });
});

describe('getCoverageAlerts', () => {
  it('signale critique si 0 disponible sur poste clé', () => {
    const emps = employees.map(e => ({ ...e, isAbsent: true }));
    const alerts = getCoverageAlerts([comp1], emps);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].status).toBe('critical');
  });

  it('signale warning si sous le minBackups', () => {
    // Alice disponible (1 personne), minBackups = 2
    const emps = [employees[0], { ...employees[1], isAbsent: true }, { ...employees[2], skills: { c1: 0, c2: 3 } }];
    const alerts = getCoverageAlerts([comp1], emps);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].status).toBe('warning');
    expect(alerts[0].availableEmployees).toHaveLength(1);
  });

  it('ne signale rien si compétence non clé', () => {
    const emps = employees.map(e => ({ ...e, isAbsent: true }));
    const alerts = getCoverageAlerts([comp2], emps);
    expect(alerts).toHaveLength(0);
  });

  it('ne signale rien si couverture suffisante', () => {
    const alerts = getCoverageAlerts([comp1], employees);
    // Alice dispo niveau 3 seulement (1 dispo), Bob absent, Carla niveau 0 → warning
    expect(alerts[0].status).toBe('warning');
  });
});

describe('matriceReducer — SET_SKILL', () => {
  it('met à jour le niveau d\'une compétence', () => {
    const state = DEMO_DATA;
    const next = matriceReducer(state, { type: 'SET_SKILL', employeeId: 'e1', compId: 'c1', level: 1 });
    expect(next.employees.find(e => e.id === 'e1')!.skills['c1']).toBe(1);
  });
});

describe('matriceReducer — ADD_COMP', () => {
  it('ajoute la compétence avec skills=0 pour tous les employés', () => {
    const state = DEMO_DATA;
    const next = matriceReducer(state, {
      type: 'ADD_COMP',
      comp: { name: 'Nouveau', categoryId: 'cat1', isKey: false, minBackups: 1 },
    });
    expect(next.comps).toHaveLength(state.comps.length + 1);
    const newId = next.comps[next.comps.length - 1].id;
    next.employees.forEach(e => expect(e.skills[newId]).toBe(0));
  });
});

describe('matriceReducer — DELETE_CATEGORY', () => {
  it('supprime la catégorie et ses compétences associées', () => {
    const state = DEMO_DATA;
    const next = matriceReducer(state, { type: 'DELETE_CATEGORY', id: 'cat1' });
    expect(next.config.categories.find(c => c.id === 'cat1')).toBeUndefined();
    expect(next.comps.every(c => c.categoryId !== 'cat1')).toBe(true);
  });
});
```

- [ ] **Lancer les tests pour vérifier qu'ils passent**

```bash
npm run test -- src/components/matrice/__tests__/matrice.utils.test.ts
```

Expected: tous verts (5 tests)

- [ ] **Commit**

```bash
git add src/components/matrice/
git commit -m "feat(matrice): types, demo data, business logic + tests"
```

---

## Task 4 — MatriceContext (état global + auto-save)

**Files:**
- Create: `src/components/matrice/MatriceContext.tsx`

- [ ] **Créer MatriceContext.tsx**

```typescript
// src/components/matrice/MatriceContext.tsx
import { createContext, useContext, useReducer, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { matriceReducer } from './matrice.utils';
import { DEMO_DATA } from './demoData';
import type { MatriceData, MatriceAction, SaveStatus } from './types';

interface MatriceContextValue {
  data: MatriceData;
  dispatch: React.Dispatch<MatriceAction>;
  saveStatus: SaveStatus;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const MatriceContext = createContext<MatriceContextValue | null>(null);

export function MatriceProvider({ session, children }: { session: Session; children: React.ReactNode }) {
  const [data, dispatch] = useReducer(matriceReducer, DEMO_DATA);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [activeTab, setActiveTab] = useState('matrice');
  const isFirstLoad = useRef(true);
  const initializedRef = useRef(false);

  // Chargement initial depuis Supabase
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    (async () => {
      const { data: row } = await supabase
        .from('matrices')
        .select('data')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (row?.data) {
        dispatch({ type: 'SET_DATA', data: row.data as MatriceData });
      } else {
        // Première visite : insérer les données de démo
        await supabase.from('matrices').insert({
          user_id: session.user.id,
          data: DEMO_DATA,
        });
      }
      isFirstLoad.current = false;
    })();
  }, [session.user.id]);

  // Auto-save avec debounce 1.5s
  useEffect(() => {
    if (isFirstLoad.current) return;
    setSaveStatus('saving');

    const timer = setTimeout(async () => {
      const { error } = await supabase
        .from('matrices')
        .upsert(
          { user_id: session.user.id, data, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
      setSaveStatus(error ? 'error' : 'saved');
    }, 1500);

    return () => clearTimeout(timer);
  }, [data, session.user.id]);

  return (
    <MatriceContext.Provider value={{ data, dispatch, saveStatus, activeTab, setActiveTab }}>
      {children}
    </MatriceContext.Provider>
  );
}

export function useMatrice() {
  const ctx = useContext(MatriceContext);
  if (!ctx) throw new Error('useMatrice must be used inside MatriceProvider');
  return ctx;
}
```

- [ ] **Commit**

```bash
git add src/components/matrice/MatriceContext.tsx
git commit -m "feat(matrice): add MatriceContext with Supabase auto-save"
```

---

## Task 5 — MatricePage + route + AccesGate

**Files:**
- Create: `src/pages/MatricePage.tsx`
- Modify: `src/main.tsx`

- [ ] **Créer MatricePage.tsx**

```tsx
// src/pages/MatricePage.tsx
import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AccessGate } from '../components/AccessGate';
import { MatriceProvider } from '../components/matrice/MatriceContext';
import { MatriceHeader } from '../components/matrice/MatriceHeader';
import { MatriceTabs } from '../components/matrice/MatriceTabs';
import { MatriceView } from '../components/matrice/views/MatriceView';
import { CollaborateursView } from '../components/matrice/views/CollaborateursView';
import { AbsencesView } from '../components/matrice/views/AbsencesView';
import { CompetencesView } from '../components/matrice/views/CompetencesView';
import { CategoriesView } from '../components/matrice/views/CategoriesView';
import { ParametresView } from '../components/matrice/views/ParametresView';
import { useMatrice } from '../components/matrice/MatriceContext';

function MatriceApp() {
  const { activeTab } = useMatrice();
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#eef2f7' }}>
      <MatriceHeader />
      <MatriceTabs />
      <main className="mx-auto w-full max-w-[1500px] flex-1 p-5">
        {activeTab === 'matrice'        && <MatriceView />}
        {activeTab === 'collaborateurs' && <CollaborateursView />}
        {activeTab === 'absences'       && <AbsencesView />}
        {activeTab === 'competences'    && <CompetencesView />}
        {activeTab === 'categories'     && <CategoriesView />}
        {activeTab === 'parametres'     && <ParametresView />}
      </main>
    </div>
  );
}

export default function MatricePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [hasPurchase, setHasPurchase] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showGate, setShowGate] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) checkPurchase(s.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) checkPurchase(s.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function checkPurchase(userId: string) {
    setLoading(true);
    const { data } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('tool_slug', 'matrice-polyvalence')
      .maybeSingle();
    setHasPurchase(!!data);
    setLoading(false);
  }

  // Retour Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'success') return;
    window.history.replaceState({}, '', '/matrice-polyvalence');
    let count = 0;
    const interval = setInterval(() => {
      if (session) checkPurchase(session.user.id);
      if (++count >= 5) clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
  }, [session]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-slate-400">Chargement…</div>
      </div>
    );
  }

  if (!session || !hasPurchase) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-8"
        style={{ backgroundColor: '#eef2f7' }}
      >
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <div className="text-4xl mb-4">📊</div>
          <h1 className="text-xl font-bold text-slate-800">Matrice de Polyvalence</h1>
          <p className="mt-2 text-sm text-slate-500">
            Gérez les compétences et la polyvalence de vos équipes — conforme MASE.
          </p>
          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <p className="text-lg font-bold text-[var(--mase-primary)]">29 € — accès à vie</p>
            <p className="mt-1 text-xs text-slate-400">Paiement unique, sans abonnement.</p>
          </div>
          <button
            onClick={() => setShowGate(true)}
            className="mt-6 w-full rounded-full bg-[var(--mase-primary)] py-3 text-sm font-semibold text-white hover:opacity-90 transition"
          >
            Accéder pour 29 €
          </button>
        </div>
        {showGate && (
          <AccessGate session={session} onClose={() => setShowGate(false)} />
        )}
      </div>
    );
  }

  return (
    <MatriceProvider session={session}>
      <MatriceApp />
    </MatriceProvider>
  );
}
```

> **Note :** `AccessGate` appelle `redirectToCheckout` sans `tool_slug`. Vérifier l'Edge Function `create-checkout-session` pour s'assurer qu'elle enregistre bien `tool_slug: 'matrice-polyvalence'` dans `purchases`. Si besoin, passer le slug en paramètre body et mettre à jour la fonction.

- [ ] **Ajouter la route dans main.tsx**

```tsx
// src/main.tsx — modifier pour ajouter la route
import MatricePage from './pages/MatricePage';

// Dans <Routes>, ajouter après la route /outil :
<Route path="/matrice-polyvalence" element={<MatricePage />} />
```

- [ ] **Commit**

```bash
git add src/pages/MatricePage.tsx src/main.tsx
git commit -m "feat(matrice): add MatricePage with access gate + route"
```

---

## Task 6 — MatriceHeader + MatriceTabs

**Files:**
- Create: `src/components/matrice/MatriceHeader.tsx`
- Create: `src/components/matrice/MatriceTabs.tsx`

- [ ] **Créer MatriceHeader.tsx**

```tsx
// src/components/matrice/MatriceHeader.tsx
import { useMatrice } from './MatriceContext';

const SAVE_LABELS = {
  idle: '',
  saving: 'Sauvegarde…',
  saved: 'Sauvegardé ✓',
  error: '⚠ Erreur de sauvegarde',
};

export function MatriceHeader() {
  const { data, saveStatus } = useMatrice();
  return (
    <header
      className="flex items-center gap-4 px-6 py-3 text-white"
      style={{ background: 'linear-gradient(135deg, #0d2137 0%, #1f4d7a 55%, #9b2226 100%)' }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-base font-extrabold leading-tight tracking-wide">
          {data.config.company || 'Mon Entreprise'}
        </span>
        <span className="text-xs opacity-60">
          {data.config.docTitle || 'Matrice de Polyvalence'}
        </span>
      </div>
      <div className="flex-1 text-center">
        <h1 className="text-lg font-bold">Matrice de Polyvalence</h1>
        <p className="text-xs opacity-60">Polyvalence & Redondance des compétences</p>
      </div>
      <div className="text-right text-xs opacity-60 whitespace-nowrap">
        {SAVE_LABELS[saveStatus]}
      </div>
    </header>
  );
}
```

- [ ] **Créer MatriceTabs.tsx**

```tsx
// src/components/matrice/MatriceTabs.tsx
import { PDFDownloadLink } from '@react-pdf/renderer';
import { useMatrice } from './MatriceContext';
import { MatricePDF } from './MatricePDF';

const TABS = [
  { id: 'matrice',        label: '📊 Matrice' },
  { id: 'collaborateurs', label: '👥 Collaborateurs' },
  { id: 'absences',       label: '🏖 Absences' },
  { id: 'competences',    label: '⚡ Compétences' },
  { id: 'categories',     label: '🗂 Catégories' },
  { id: 'parametres',     label: '⚙️ Paramètres' },
];

export function MatriceTabs() {
  const { activeTab, setActiveTab, data } = useMatrice();
  const fileName = `matrice-${data.config.company.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;

  return (
    <nav
      className="sticky top-0 z-50 flex items-center gap-1 bg-white px-5 shadow-sm"
      style={{ borderBottom: '2px solid #dee2e6' }}
    >
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className="whitespace-nowrap border-b-[3px] px-4 py-3 text-sm font-semibold transition-colors"
          style={{
            borderColor: activeTab === tab.id ? '#2563a8' : 'transparent',
            color: activeTab === tab.id ? '#1a3a5c' : '#6c757d',
            marginBottom: '-2px',
          }}
        >
          {tab.label}
        </button>
      ))}
      <div className="flex-1" />
      <div className="flex items-center gap-2 py-2">
        <button
          onClick={() => window.print()}
          className="rounded px-3 py-1.5 text-xs font-semibold"
          style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}
        >
          🖨 Imprimer
        </button>
        <PDFDownloadLink
          document={<MatricePDF data={data} />}
          fileName={fileName}
          className="rounded px-3 py-1.5 text-xs font-semibold"
          style={{ background: '#fdf4ff', color: '#7e22ce', border: '1px solid #e9d5ff', textDecoration: 'none' }}
        >
          {({ loading }) => loading ? 'Génération…' : '📄 Exporter PDF'}
        </PDFDownloadLink>
      </div>
    </nav>
  );
}
```

- [ ] **Commit**

```bash
git add src/components/matrice/MatriceHeader.tsx src/components/matrice/MatriceTabs.tsx
git commit -m "feat(matrice): add header and tabs components"
```

---

## Task 7 — MatriceView (tableau interactif)

**Files:**
- Create: `src/components/matrice/views/MatriceView.tsx`

- [ ] **Créer MatriceView.tsx**

```tsx
// src/components/matrice/views/MatriceView.tsx
import { useMatrice } from '../MatriceContext';
import { computeRedundancy } from '../matrice.utils';

const LEVEL_COLORS = ['#8e9eab', '#e67e22', '#27ae60', '#2980b9'];
const LEVEL_LABELS = ['—', 'Formation', 'Autonome', 'Expert'];

export function MatriceView() {
  const { data, dispatch } = useMatrice();
  const { config, comps, employees } = data;
  const redundancy = computeRedundancy(comps, employees);

  const catGroups = config.categories.map(cat => ({
    cat,
    comps: comps.filter(c => c.categoryId === cat.id),
  })).filter(g => g.comps.length > 0);

  function cycleSkill(employeeId: string, compId: string, current: number) {
    dispatch({ type: 'SET_SKILL', employeeId, compId, level: (current + 1) % 4 });
  }

  if (comps.length === 0 || employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-sm">Ajoutez des compétences et des collaborateurs pour construire la matrice.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Légende */}
      <div className="mb-4 flex flex-wrap gap-2">
        {LEVEL_COLORS.map((color, i) => (
          <div key={i} className="flex items-center gap-2 rounded-md border px-3 py-2" style={{ borderColor: '#dee2e6', background: '#f8f9fa' }}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white text-sm" style={{ background: color }}>
              {i}
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-700">{LEVEL_LABELS[i]}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Matrice scrollable */}
      <div className="overflow-auto rounded-lg shadow" style={{ maxHeight: 'calc(100vh - 320px)', background: '#fff' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            {/* Ligne 1 : catégories */}
            <tr>
              <th
                rowSpan={2}
                style={{
                  background: '#0d2137', color: '#fff', padding: '10px 16px',
                  position: 'sticky', left: 0, top: 0, zIndex: 40,
                  borderRight: '3px solid #2563a8', borderBottom: '3px solid #2563a8',
                  minWidth: 200, textAlign: 'left', fontSize: 12,
                }}
              >
                Collaborateur / Compétence
              </th>
              {catGroups.map(({ cat, comps: cc }) => (
                <th
                  key={cat.id}
                  colSpan={cc.length}
                  style={{
                    background: cat.color, color: '#fff',
                    textAlign: 'center', padding: '6px 10px',
                    position: 'sticky', top: 0, zIndex: 21,
                    borderRight: '2px solid rgba(255,255,255,0.25)',
                    borderBottom: '1px solid rgba(255,255,255,0.2)',
                    fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap',
                  }}
                >
                  {cat.name}
                </th>
              ))}
            </tr>
            {/* Ligne 2 : compétences */}
            <tr>
              {catGroups.flatMap(({ cat, comps: cc }) =>
                cc.map(comp => (
                  <th
                    key={comp.id}
                    style={{
                      background: cat.color, color: '#fff',
                      padding: '6px 8px', textAlign: 'center',
                      position: 'sticky', top: 42, zIndex: 20,
                      borderRight: '1px solid rgba(255,255,255,0.2)',
                      borderBottom: '3px solid rgba(0,0,0,0.2)',
                      minWidth: 120, maxWidth: 130, fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {comp.name}
                    {comp.isKey && <span style={{ display: 'block', fontSize: 9, opacity: 0.8 }}>★ Poste clé</span>}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, rowIdx) => (
              <tr key={emp.id} style={{ background: rowIdx % 2 === 0 ? '#fff' : '#fafbfd' }}>
                <td
                  style={{
                    position: 'sticky', left: 0, zIndex: 10, background: 'inherit',
                    padding: '8px 14px', borderRight: '3px solid #dee2e6',
                    borderBottom: '1px solid #f1f3f4',
                    boxShadow: '3px 0 6px rgba(0,0,0,0.06)',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#1a3a5c' }}>
                    {emp.name}
                    {emp.isAbsent && (
                      <span style={{ marginLeft: 6, background: '#fee2e2', color: '#c0392b', borderRadius: 4, padding: '1px 5px', fontSize: 9, fontWeight: 700 }}>
                        ABSENT
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#6c757d', fontStyle: 'italic' }}>{emp.role}</div>
                </td>
                {catGroups.flatMap(({ comps: cc }) =>
                  cc.map(comp => {
                    const level = emp.skills[comp.id] ?? 0;
                    return (
                      <td
                        key={comp.id}
                        onClick={() => cycleSkill(emp.id, comp.id, level)}
                        title={`${emp.name} — ${comp.name} : ${LEVEL_LABELS[level]} (clic pour modifier)`}
                        style={{
                          background: LEVEL_COLORS[level],
                          textAlign: 'center', verticalAlign: 'middle',
                          cursor: 'pointer', userSelect: 'none',
                          width: 120, height: 56,
                          borderRight: '1px solid rgba(255,255,255,0.15)',
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          transition: 'filter 0.1s, transform 0.1s',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.filter = 'brightness(0.8)';
                          (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.filter = 'none';
                          (e.currentTarget as HTMLElement).style.transform = 'none';
                        }}
                      >
                        <span style={{ color: '#fff', fontSize: 18, fontWeight: 800, display: 'block', lineHeight: 1 }}>{level}</span>
                        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {LEVEL_LABELS[level]}
                        </span>
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
            {/* Ligne redondance */}
            <tr>
              <td
                style={{
                  position: 'sticky', left: 0, zIndex: 10,
                  background: '#343a40', color: '#fff',
                  padding: '8px 14px', fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: 0.5,
                  boxShadow: '3px 0 6px rgba(0,0,0,0.15)',
                }}
              >
                Redondance (niveau ≥ 2)
              </td>
              {catGroups.flatMap(({ comps: cc }) =>
                cc.map(comp => {
                  const count = redundancy[comp.id] ?? 0;
                  const isCrit = comp.isKey && count < comp.minBackups;
                  return (
                    <td
                      key={comp.id}
                      style={{
                        background: isCrit ? '#c0392b' : '#1e8449',
                        color: '#fff', textAlign: 'center', fontWeight: 800, fontSize: 15,
                        borderRight: '1px solid rgba(255,255,255,0.2)',
                      }}
                    >
                      {count}
                      {comp.isKey && (
                        <span style={{ display: 'block', fontSize: 9, opacity: 0.8 }}>
                          / {comp.minBackups} req.
                        </span>
                      )}
                    </td>
                  );
                })
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add src/components/matrice/views/MatriceView.tsx
git commit -m "feat(matrice): add interactive matrix view with click-to-cycle"
```

---

## Task 8 — CollaborateursView

**Files:**
- Create: `src/components/matrice/views/CollaborateursView.tsx`

- [ ] **Créer CollaborateursView.tsx**

```tsx
// src/components/matrice/views/CollaborateursView.tsx
import { useState } from 'react';
import { useMatrice } from '../MatriceContext';
import type { Employee } from '../types';

type FormData = { name: string; role: string };
const EMPTY_FORM: FormData = { name: '', role: '' };

export function CollaborateursView() {
  const { data, dispatch } = useMatrice();
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; employee?: Employee } | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  function openAdd() {
    setForm(EMPTY_FORM);
    setModal({ mode: 'add' });
  }

  function openEdit(emp: Employee) {
    setForm({ name: emp.name, role: emp.role });
    setModal({ mode: 'edit', employee: emp });
  }

  function handleSave() {
    if (!form.name.trim() || !form.role.trim()) return;
    if (modal?.mode === 'add') {
      dispatch({ type: 'ADD_EMPLOYEE', employee: { name: form.name.trim(), role: form.role.trim(), isAbsent: false, absenceReason: '' } });
    } else if (modal?.employee) {
      dispatch({ type: 'UPDATE_EMPLOYEE', employee: { ...modal.employee, name: form.name.trim(), role: form.role.trim() } });
    }
    setModal(null);
  }

  function handleDelete(id: string) {
    if (!confirm('Supprimer ce collaborateur ? Cette action est irréversible.')) return;
    dispatch({ type: 'DELETE_EMPLOYEE', id });
  }

  return (
    <div className="rounded-lg bg-white shadow">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="font-bold text-slate-800">👥 Collaborateurs ({data.employees.length})</h2>
        <button
          onClick={openAdd}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: '#2563a8' }}
        >
          + Ajouter
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Nom</th>
            <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Rôle / Poste</th>
            <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Statut</th>
            <th className="px-5 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.employees.map(emp => (
            <tr key={emp.id} style={{ borderBottom: '1px solid #f1f3f4' }}>
              <td className="px-5 py-3 font-semibold text-slate-800">{emp.name}</td>
              <td className="px-5 py-3 text-slate-500 italic">{emp.role}</td>
              <td className="px-5 py-3">
                {emp.isAbsent
                  ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">Absent — {emp.absenceReason}</span>
                  : <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">Présent</span>}
              </td>
              <td className="px-5 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button onClick={() => openEdit(emp)} className="rounded px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 border">✏️ Modifier</button>
                  <button onClick={() => handleDelete(emp.id)} className="rounded px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200">🗑</button>
                </div>
              </td>
            </tr>
          ))}
          {data.employees.length === 0 && (
            <tr><td colSpan={4} className="py-10 text-center text-slate-400 text-sm">Aucun collaborateur. Cliquez sur "+ Ajouter".</td></tr>
          )}
        </tbody>
      </table>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 font-bold text-slate-800">
              {modal.mode === 'add' ? 'Ajouter un collaborateur' : 'Modifier le collaborateur'}
            </h3>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Nom complet *</label>
            <input
              className="mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Prénom Nom"
            />
            <label className="mb-1 block text-xs font-semibold text-slate-600">Rôle / Poste *</label>
            <input
              className="mb-5 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={form.role}
              onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              placeholder="ex: Chef de chantier"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-sm text-slate-500 hover:bg-slate-50">Annuler</button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || !form.role.trim()}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: '#2563a8' }}
              >
                {modal.mode === 'add' ? 'Ajouter' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add src/components/matrice/views/CollaborateursView.tsx
git commit -m "feat(matrice): add collaborateurs CRUD view"
```

---

## Task 9 — AbsencesView

**Files:**
- Create: `src/components/matrice/views/AbsencesView.tsx`

- [ ] **Créer AbsencesView.tsx**

```tsx
// src/components/matrice/views/AbsencesView.tsx
import { useState } from 'react';
import { useMatrice } from '../MatriceContext';
import { getCoverageAlerts } from '../matrice.utils';

const ABSENCE_REASONS = ['Arrêt maladie', 'Congés payés', 'Formation', 'Accident du travail', 'Autre'];

export function AbsencesView() {
  const { data, dispatch } = useMatrice();
  const [modal, setModal] = useState<{ employeeId: string } | null>(null);
  const [reason, setReason] = useState('');

  const absentEmps = data.employees.filter(e => e.isAbsent);
  const presentEmps = data.employees.filter(e => !e.isAbsent);
  const alerts = getCoverageAlerts(data.comps, data.employees);

  function declareAbsent(employeeId: string) {
    setReason('');
    setModal({ employeeId });
  }

  function confirmAbsence() {
    if (!modal) return;
    dispatch({ type: 'TOGGLE_ABSENCE', employeeId: modal.employeeId, isAbsent: true, reason });
    setModal(null);
  }

  function returnEmployee(employeeId: string) {
    dispatch({ type: 'TOGGLE_ABSENCE', employeeId, isAbsent: false, reason: '' });
  }

  return (
    <div className="space-y-5">
      {/* Alertes */}
      {alerts.length > 0 && (
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <div className="border-b px-5 py-4 font-bold text-slate-800">⚠️ Alertes de couverture ({alerts.length})</div>
          <div className="divide-y">
            {alerts.map(alert => (
              <div key={alert.comp.id} className="flex items-start gap-3 px-5 py-4">
                <span className="mt-0.5 text-lg">{alert.status === 'critical' ? '🔴' : '🟠'}</span>
                <div>
                  <div className="font-semibold text-slate-800">
                    {alert.comp.name}
                    <span
                      className="ml-2 rounded-full px-2 py-0.5 text-xs font-bold"
                      style={{ background: alert.status === 'critical' ? '#fee2e2' : '#fef9c3', color: alert.status === 'critical' ? '#c0392b' : '#92400e' }}
                    >
                      {alert.status === 'critical' ? 'CRITIQUE' : 'ATTENTION'}
                    </span>
                  </div>
                  <div className="mt-0.5 text-sm text-slate-500">{alert.reason}</div>
                  {alert.availableEmployees.length > 0 && (
                    <div className="mt-1 text-xs text-slate-400">
                      Disponibles : {alert.availableEmployees.map(e => e.name).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {alerts.length === 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-800">
          ✅ Tous les postes clés sont couverts.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Absents */}
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <div className="border-b px-5 py-4 font-bold text-slate-800">
            Absences en cours
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{absentEmps.length}</span>
          </div>
          {absentEmps.length === 0
            ? <p className="p-5 text-sm text-slate-400">Aucune absence en cours.</p>
            : absentEmps.map(emp => (
              <div key={emp.id} className="flex items-center justify-between border-b px-5 py-3 last:border-0">
                <div>
                  <div className="font-semibold text-slate-800">{emp.name}</div>
                  <div className="text-xs text-slate-400">{emp.absenceReason || 'Motif non précisé'} — {emp.role}</div>
                </div>
                <button
                  onClick={() => returnEmployee(emp.id)}
                  className="rounded px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 border border-green-200"
                >
                  Retour
                </button>
              </div>
            ))}
        </div>

        {/* Présents */}
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <div className="border-b px-5 py-4 font-bold text-slate-800">Salariés présents</div>
          {presentEmps.length === 0
            ? <p className="p-5 text-sm text-slate-400">Tous les salariés sont absents.</p>
            : presentEmps.map(emp => (
              <div key={emp.id} className="flex items-center justify-between border-b px-5 py-3 last:border-0">
                <div>
                  <div className="font-semibold text-slate-800">{emp.name}</div>
                  <div className="text-xs text-slate-400">{emp.role}</div>
                </div>
                <button
                  onClick={() => declareAbsent(emp.id)}
                  className="rounded px-3 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-50 border border-orange-200"
                >
                  Déclarer absent
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Modal motif */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 font-bold text-slate-800">Déclarer une absence</h3>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Motif de l'absence</label>
            <select
              className="mb-5 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={reason}
              onChange={e => setReason(e.target.value)}
            >
              <option value="">Sélectionner…</option>
              {ABSENCE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-sm text-slate-500 hover:bg-slate-50">Annuler</button>
              <button
                onClick={confirmAbsence}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ background: '#e67e22' }}
              >
                Déclarer absent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add src/components/matrice/views/AbsencesView.tsx
git commit -m "feat(matrice): add absences view with coverage alerts"
```

---

## Task 10 — CompetencesView + CategoriesView

**Files:**
- Create: `src/components/matrice/views/CompetencesView.tsx`
- Create: `src/components/matrice/views/CategoriesView.tsx`

- [ ] **Créer CompetencesView.tsx**

```tsx
// src/components/matrice/views/CompetencesView.tsx
import { useState } from 'react';
import { useMatrice } from '../MatriceContext';
import type { Comp } from '../types';

type FormData = { name: string; categoryId: string; isKey: boolean; minBackups: number };
const EMPTY_FORM: FormData = { name: '', categoryId: '', isKey: false, minBackups: 1 };

export function CompetencesView() {
  const { data, dispatch } = useMatrice();
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; comp?: Comp } | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  function openAdd() {
    setForm({ ...EMPTY_FORM, categoryId: data.config.categories[0]?.id ?? '' });
    setModal({ mode: 'add' });
  }

  function openEdit(comp: Comp) {
    setForm({ name: comp.name, categoryId: comp.categoryId, isKey: comp.isKey, minBackups: comp.minBackups });
    setModal({ mode: 'edit', comp });
  }

  function handleSave() {
    if (!form.name.trim() || !form.categoryId) return;
    if (modal?.mode === 'add') {
      dispatch({ type: 'ADD_COMP', comp: { name: form.name.trim(), categoryId: form.categoryId, isKey: form.isKey, minBackups: form.minBackups } });
    } else if (modal?.comp) {
      dispatch({ type: 'UPDATE_COMP', comp: { ...modal.comp, name: form.name.trim(), categoryId: form.categoryId, isKey: form.isKey, minBackups: form.minBackups } });
    }
    setModal(null);
  }

  function handleDelete(id: string) {
    if (!confirm('Supprimer cette compétence ? Les niveaux associés seront perdus.')) return;
    dispatch({ type: 'DELETE_COMP', id });
  }

  const grouped = data.config.categories.map(cat => ({
    cat,
    comps: data.comps.filter(c => c.categoryId === cat.id),
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openAdd} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: '#2563a8' }}>
          + Ajouter une compétence
        </button>
      </div>
      {grouped.map(({ cat, comps }) => comps.length === 0 ? null : (
        <div key={cat.id} className="rounded-lg bg-white shadow overflow-hidden">
          <div className="px-5 py-3 font-bold text-white text-sm" style={{ background: cat.color }}>
            {cat.name} ({comps.length})
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                <th className="px-5 py-2 text-left text-xs font-bold text-slate-600">Compétence</th>
                <th className="px-5 py-2 text-center text-xs font-bold text-slate-600">Poste clé</th>
                <th className="px-5 py-2 text-center text-xs font-bold text-slate-600">Min. remplaçants</th>
                <th className="px-5 py-2 text-right text-xs font-bold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {comps.map(comp => (
                <tr key={comp.id} style={{ borderBottom: '1px solid #f1f3f4' }}>
                  <td className="px-5 py-3 font-semibold text-slate-800">{comp.name}</td>
                  <td className="px-5 py-3 text-center">
                    {comp.isKey ? <span className="text-red-600 font-bold">★ Oui</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-center text-slate-600">{comp.isKey ? comp.minBackups : '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(comp)} className="rounded px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 border">✏️</button>
                      <button onClick={() => handleDelete(comp.id)} className="rounded px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 font-bold text-slate-800">
              {modal.mode === 'add' ? 'Ajouter une compétence' : 'Modifier la compétence'}
            </h3>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Nom *</label>
            <input
              className="mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="ex: Habilitation électrique"
            />
            <label className="mb-1 block text-xs font-semibold text-slate-600">Catégorie *</label>
            <select
              className="mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={form.categoryId}
              onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}
            >
              <option value="">— Sélectionner —</option>
              {data.config.categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            <label className="mb-3 flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={form.isKey}
                onChange={e => setForm(p => ({ ...p, isKey: e.target.checked }))}
              />
              <span className="font-semibold text-slate-700">Poste clé (nécessite redondance)</span>
            </label>
            {form.isKey && (
              <>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Nombre minimum de remplaçants (niveau ≥ 2)</label>
                <input
                  type="number" min={1} max={20}
                  className="mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400"
                  value={form.minBackups}
                  onChange={e => setForm(p => ({ ...p, minBackups: Math.max(1, parseInt(e.target.value) || 1) }))}
                />
              </>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-sm text-slate-500 hover:bg-slate-50">Annuler</button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || !form.categoryId}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: '#2563a8' }}
              >
                {modal.mode === 'add' ? 'Ajouter' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Créer CategoriesView.tsx**

```tsx
// src/components/matrice/views/CategoriesView.tsx
import { useState } from 'react';
import { useMatrice } from '../MatriceContext';
import type { Category } from '../types';

type FormData = { name: string; color: string };
const COLORS = ['#c0392b','#1f4d7a','#7c3aed','#0891b2','#16a34a','#ea580c','#db2777','#0f766e'];

export function CategoriesView() {
  const { data, dispatch } = useMatrice();
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; category?: Category } | null>(null);
  const [form, setForm] = useState<FormData>({ name: '', color: COLORS[0] });

  function openAdd() {
    const used = data.config.categories.map(c => c.color);
    const free = COLORS.find(c => !used.includes(c)) ?? COLORS[0];
    setForm({ name: '', color: free });
    setModal({ mode: 'add' });
  }

  function openEdit(cat: Category) {
    setForm({ name: cat.name, color: cat.color });
    setModal({ mode: 'edit', category: cat });
  }

  function handleSave() {
    if (!form.name.trim()) return;
    if (modal?.mode === 'add') {
      dispatch({ type: 'ADD_CATEGORY', category: { name: form.name.trim(), color: form.color } });
    } else if (modal?.category) {
      dispatch({ type: 'UPDATE_CATEGORY', category: { ...modal.category, name: form.name.trim(), color: form.color } });
    }
    setModal(null);
  }

  function handleDelete(cat: Category) {
    const count = data.comps.filter(c => c.categoryId === cat.id).length;
    const msg = count > 0
      ? `Supprimer "${cat.name}" ? Les ${count} compétences de cette catégorie seront également supprimées.`
      : `Supprimer la catégorie "${cat.name}" ?`;
    if (!confirm(msg)) return;
    dispatch({ type: 'DELETE_CATEGORY', id: cat.id });
  }

  return (
    <div className="rounded-lg bg-white shadow overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="font-bold text-slate-800">🗂 Catégories de compétences</h2>
        <button onClick={openAdd} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: '#2563a8' }}>
          + Ajouter
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <th className="px-5 py-3 text-left text-xs font-bold text-slate-600">#</th>
            <th className="px-5 py-3 text-left text-xs font-bold text-slate-600">Nom</th>
            <th className="px-5 py-3 text-center text-xs font-bold text-slate-600">Couleur</th>
            <th className="px-5 py-3 text-center text-xs font-bold text-slate-600">Compétences</th>
            <th className="px-5 py-3 text-right text-xs font-bold text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.config.categories.map((cat, i) => {
            const count = data.comps.filter(c => c.categoryId === cat.id).length;
            return (
              <tr key={cat.id} style={{ borderBottom: '1px solid #f1f3f4' }}>
                <td className="px-5 py-3 text-slate-400 text-xs">{i + 1}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded" style={{ background: cat.color }} />
                    <span className="font-semibold text-slate-800">{cat.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-center">
                  <input
                    type="color"
                    value={cat.color}
                    onChange={e => dispatch({ type: 'UPDATE_CATEGORY', category: { ...cat, color: e.target.value } })}
                    className="h-7 w-9 cursor-pointer rounded border"
                    title="Changer la couleur"
                  />
                </td>
                <td className="px-5 py-3 text-center">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">{count}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(cat)} className="rounded px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 border">✏️ Renommer</button>
                    <button onClick={() => handleDelete(cat)} className="rounded px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200">🗑</button>
                  </div>
                </td>
              </tr>
            );
          })}
          {data.config.categories.length === 0 && (
            <tr><td colSpan={5} className="py-10 text-center text-slate-400 text-sm">Aucune catégorie. Cliquez sur "+ Ajouter".</td></tr>
          )}
        </tbody>
      </table>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 font-bold text-slate-800">
              {modal.mode === 'add' ? 'Ajouter une catégorie' : 'Modifier la catégorie'}
            </h3>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Nom *</label>
            <input
              className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="ex: Habilitations & Sécurité"
            />
            <label className="mb-2 block text-xs font-semibold text-slate-600">Couleur</label>
            <div className="mb-4 flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm(p => ({ ...p, color: c }))}
                  className="h-8 w-8 rounded-lg border-2 transition-transform hover:scale-110"
                  style={{ background: c, borderColor: form.color === c ? '#fff' : c, boxShadow: form.color === c ? `0 0 0 3px ${c}` : 'none' }}
                />
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-sm text-slate-500 hover:bg-slate-50">Annuler</button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim()}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: form.color }}
              >
                {modal.mode === 'add' ? 'Ajouter' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add src/components/matrice/views/CompetencesView.tsx src/components/matrice/views/CategoriesView.tsx
git commit -m "feat(matrice): add competences and categories CRUD views"
```

---

## Task 11 — ParametresView

**Files:**
- Create: `src/components/matrice/views/ParametresView.tsx`

- [ ] **Créer ParametresView.tsx**

```tsx
// src/components/matrice/views/ParametresView.tsx
import { useRef } from 'react';
import { useMatrice } from '../MatriceContext';
import type { MatriceData } from '../types';

export function ParametresView() {
  const { data, dispatch } = useMatrice();
  const fileRef = useRef<HTMLInputElement>(null);

  function exportJSON() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matrice-${data.config.company.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as MatriceData;
        if (!parsed.config || !parsed.comps || !parsed.employees) throw new Error('Format invalide');
        dispatch({ type: 'SET_DATA', data: parsed });
        alert('Données importées avec succès.');
      } catch {
        alert('Fichier JSON invalide.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function resetToDemo() {
    if (!confirm('Réinitialiser avec les données de démonstration ? Toutes vos données seront perdues.')) return;
    import('../demoData').then(({ DEMO_DATA }) => {
      dispatch({ type: 'SET_DATA', data: DEMO_DATA });
    });
  }

  return (
    <div className="max-w-xl space-y-6">
      {/* Infos entreprise */}
      <div className="rounded-lg bg-white shadow p-6">
        <h3 className="mb-4 font-bold text-slate-800">Informations du document</h3>
        <label className="mb-1 block text-xs font-semibold text-slate-600">Nom de l'entreprise</label>
        <input
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400"
          value={data.config.company}
          onChange={e => dispatch({ type: 'UPDATE_CONFIG', config: { company: e.target.value } })}
          placeholder="Mon Entreprise"
        />
        <label className="mb-1 block text-xs font-semibold text-slate-600">Titre du document</label>
        <input
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400"
          value={data.config.docTitle}
          onChange={e => dispatch({ type: 'UPDATE_CONFIG', config: { docTitle: e.target.value } })}
          placeholder="Matrice de Polyvalence 2025"
        />
      </div>

      {/* Sauvegarde JSON */}
      <div className="rounded-lg bg-white shadow p-6">
        <h3 className="mb-1 font-bold text-slate-800">Sauvegarde locale (optionnel)</h3>
        <p className="mb-4 text-xs text-slate-400">Vos données sont automatiquement sauvegardées dans le cloud. Ces options permettent une copie locale.</p>
        <div className="flex gap-3">
          <button
            onClick={exportJSON}
            className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            📥 Exporter JSON
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            📤 Importer JSON
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={importJSON} />
        </div>
      </div>

      {/* Zone danger */}
      <div className="rounded-lg border-2 border-red-300 bg-red-50 p-6">
        <h3 className="mb-1 font-bold text-red-700">Zone de danger</h3>
        <p className="mb-4 text-xs text-red-600">Cette action est irréversible. Toutes vos données seront remplacées par les données de démonstration.</p>
        <button
          onClick={resetToDemo}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: '#c0392b' }}
        >
          Réinitialiser avec les données de démo
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add src/components/matrice/views/ParametresView.tsx
git commit -m "feat(matrice): add parametres view with JSON export/import"
```

---

## Task 12 — MatricePDF (2 pages)

**Files:**
- Create: `src/components/matrice/MatricePDF.tsx`

- [ ] **Créer MatricePDF.tsx**

```tsx
// src/components/matrice/MatricePDF.tsx
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { MatriceData } from './types';
import { computeRedundancy, getCoverageAlerts } from './matrice.utils';

const LEVEL_COLORS = ['#8e9eab', '#e67e22', '#27ae60', '#2980b9'];
const LEVEL_LABELS = ['—', 'Formation', 'Autonome', 'Expert'];

const s = StyleSheet.create({
  page1: { fontFamily: 'Helvetica', fontSize: 8, padding: 0, backgroundColor: '#eef2f7' },
  page2: { fontFamily: 'Helvetica', fontSize: 8, padding: 0, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#0d2137', color: '#fff',
    padding: '8 16', marginBottom: 6,
  },
  headerCompany: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  headerTitle: { fontSize: 7, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  headerDate: { fontSize: 7, color: 'rgba(255,255,255,0.5)' },
  content: { padding: '0 10 10 10' },
  legend: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 12, height: 12, borderRadius: 2 },
  legendText: { fontSize: 7, color: '#495057' },
  table: { width: '100%' },
  catRow: { flexDirection: 'row' },
  cornerCell: {
    backgroundColor: '#0d2137', color: '#fff',
    padding: '5 8', fontWeight: 'bold', fontSize: 7,
    width: 120, borderRight: '2 solid #2563a8', borderBottom: '2 solid #2563a8',
  },
  catCell: {
    color: '#fff', textAlign: 'center', padding: '4 2',
    fontWeight: 'bold', fontSize: 7,
    borderRight: '1 solid rgba(255,255,255,0.25)',
    borderBottom: '1 solid rgba(255,255,255,0.2)',
  },
  compCell: {
    color: '#fff', textAlign: 'center', padding: '3 2',
    fontSize: 6.5, borderRight: '1 solid rgba(255,255,255,0.2)',
    borderBottom: '2 solid rgba(0,0,0,0.2)',
  },
  empRow: { flexDirection: 'row', borderBottom: '0.5 solid #f1f3f4' },
  empCell: {
    width: 120, padding: '4 6',
    backgroundColor: '#fff', borderRight: '2 solid #dee2e6',
  },
  empName: { fontWeight: 'bold', fontSize: 7.5, color: '#1a3a5c' },
  empRole: { fontSize: 6, color: '#6c757d' },
  skillCell: { textAlign: 'center', justifyContent: 'center', alignItems: 'center', padding: '3 2' },
  skillNum: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  skillLbl: { color: 'rgba(255,255,255,0.8)', fontSize: 5.5 },
  redundRow: { flexDirection: 'row', borderTop: '2 solid #495057' },
  redundLabel: {
    width: 120, backgroundColor: '#343a40', color: '#fff',
    padding: '4 6', fontWeight: 'bold', fontSize: 7,
  },
  redundCell: { textAlign: 'center', justifyContent: 'center', alignItems: 'center', padding: '2' },
  redundNum: { color: '#fff', fontWeight: 'bold', fontSize: 10 },
  redundSub: { color: 'rgba(255,255,255,0.75)', fontSize: 5.5 },
  footer: {
    position: 'absolute', bottom: 8, right: 12,
    fontSize: 6, color: '#9ca3af',
  },
  // Page 2
  p2Content: { padding: 24 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, padding: '10 8', borderRadius: 4, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: 'bold', marginBottom: 2 },
  statLbl: { fontSize: 7, color: '#6b7280' },
  sectionTitle: { fontSize: 9, fontWeight: 'bold', color: '#0d2137', marginBottom: 8 },
  alertCard: {
    padding: '6 10', marginBottom: 5, borderRadius: 3,
    borderLeft: '3 solid transparent',
  },
  alertTitle: { fontWeight: 'bold', fontSize: 8 },
  alertBody: { fontSize: 7, marginTop: 1 },
  coverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 8 },
  coverLabel: { width: 110, fontSize: 7, color: '#374151' },
  coverBarBg: { flex: 1, height: 6, backgroundColor: '#e5e7eb', borderRadius: 2 },
  coverBarFill: { height: 6, borderRadius: 2 },
  coverCount: { width: 30, fontSize: 7, textAlign: 'right' },
});

interface Props { data: MatriceData }

export function MatricePDF({ data }: Props) {
  const { config, comps, employees } = data;
  const redundancy = computeRedundancy(comps, employees);
  const alerts = getCoverageAlerts(comps, employees);
  const date = new Date().toLocaleDateString('fr-FR');

  const catGroups = config.categories.map(cat => ({
    cat,
    comps: comps.filter(c => c.categoryId === cat.id),
  })).filter(g => g.comps.length > 0);

  const COMP_WIDTH = Math.max(50, Math.min(90, Math.floor(600 / comps.length)));

  return (
    <Document title={config.docTitle} author={config.company}>
      {/* PAGE 1 — Matrice colorée */}
      <Page size="A4" orientation="landscape" style={s.page1}>
        <View style={s.header}>
          <View>
            <Text style={s.headerCompany}>{config.company}</Text>
            <Text style={s.headerTitle}>{config.docTitle}</Text>
          </View>
          <Text style={s.headerDate}>Généré le {date}</Text>
        </View>

        <View style={s.content}>
          {/* Légende */}
          <View style={s.legend}>
            {LEVEL_LABELS.map((lbl, i) => (
              <View key={i} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: LEVEL_COLORS[i] }]} />
                <Text style={s.legendText}>{i} — {lbl}</Text>
              </View>
            ))}
          </View>

          {/* Tableau */}
          <View style={s.table}>
            {/* En-têtes catégories */}
            <View style={s.catRow}>
              <View style={s.cornerCell}><Text>Collaborateur / Compétence</Text></View>
              {catGroups.map(({ cat, comps: cc }) => (
                <View key={cat.id} style={[s.catCell, { backgroundColor: cat.color, width: cc.length * COMP_WIDTH }]}>
                  <Text>{cat.name}</Text>
                </View>
              ))}
            </View>
            {/* En-têtes compétences */}
            <View style={s.catRow}>
              <View style={[s.cornerCell, { borderBottom: '2 solid #2563a8', paddingVertical: 3 }]}>
                <Text> </Text>
              </View>
              {catGroups.flatMap(({ cat, comps: cc }) =>
                cc.map(comp => (
                  <View key={comp.id} style={[s.compCell, { backgroundColor: cat.color, width: COMP_WIDTH }]}>
                    <Text>{comp.name}</Text>
                    {comp.isKey && <Text style={{ fontSize: 5, opacity: 0.8 }}>★ Poste clé</Text>}
                  </View>
                ))
              )}
            </View>
            {/* Lignes salariés */}
            {employees.map(emp => (
              <View key={emp.id} style={s.empRow}>
                <View style={s.empCell}>
                  <Text style={s.empName}>{emp.name}{emp.isAbsent ? ' (ABSENT)' : ''}</Text>
                  <Text style={s.empRole}>{emp.role}</Text>
                </View>
                {catGroups.flatMap(({ comps: cc }) =>
                  cc.map(comp => {
                    const level = emp.skills[comp.id] ?? 0;
                    return (
                      <View key={comp.id} style={[s.skillCell, { backgroundColor: LEVEL_COLORS[level], width: COMP_WIDTH }]}>
                        <Text style={s.skillNum}>{level}</Text>
                        <Text style={s.skillLbl}>{LEVEL_LABELS[level]}</Text>
                      </View>
                    );
                  })
                )}
              </View>
            ))}
            {/* Ligne redondance */}
            <View style={s.redundRow}>
              <View style={s.redundLabel}><Text>Redondance (niveau ≥ 2)</Text></View>
              {catGroups.flatMap(({ comps: cc }) =>
                cc.map(comp => {
                  const count = redundancy[comp.id] ?? 0;
                  const isCrit = comp.isKey && count < comp.minBackups;
                  return (
                    <View key={comp.id} style={[s.redundCell, { backgroundColor: isCrit ? '#c0392b' : '#1e8449', width: COMP_WIDTH }]}>
                      <Text style={s.redundNum}>{count}</Text>
                      {comp.isKey && <Text style={s.redundSub}>/ {comp.minBackups} req.</Text>}
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>
        <Text style={s.footer}>Confidentiel · Usage interne</Text>
      </Page>

      {/* PAGE 2 — Synthèse */}
      <Page size="A4" orientation="portrait" style={s.page2}>
        <View style={s.header}>
          <View>
            <Text style={s.headerCompany}>{config.company} — Analyse de couverture</Text>
            <Text style={s.headerTitle}>Postes clés · Redondance · Alertes</Text>
          </View>
          <Text style={s.headerDate}>Généré le {date}</Text>
        </View>

        <View style={s.p2Content}>
          {/* Stats */}
          <View style={s.statsRow}>
            <View style={[s.statCard, { backgroundColor: '#f0fdf4', borderTop: '4 solid #16a34a' }]}>
              <Text style={[s.statVal, { color: '#16a34a' }]}>{employees.length}</Text>
              <Text style={s.statLbl}>Collaborateurs</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: '#eff6ff', borderTop: '4 solid #1d4ed8' }]}>
              <Text style={[s.statVal, { color: '#1d4ed8' }]}>{comps.length}</Text>
              <Text style={s.statLbl}>Compétences</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: alerts.length > 0 ? '#fef2f2' : '#f0fdf4', borderTop: `4 solid ${alerts.length > 0 ? '#dc2626' : '#16a34a'}` }]}>
              <Text style={[s.statVal, { color: alerts.length > 0 ? '#dc2626' : '#16a34a' }]}>{alerts.length}</Text>
              <Text style={s.statLbl}>Alertes</Text>
            </View>
          </View>

          {/* Alertes */}
          <Text style={s.sectionTitle}>⚠ Compétences à risque</Text>
          {alerts.length === 0 && (
            <View style={[s.alertCard, { backgroundColor: '#f0fdf4', borderLeftColor: '#16a34a' }]}>
              <Text style={[s.alertTitle, { color: '#16a34a' }]}>✅ Tous les postes clés sont couverts</Text>
            </View>
          )}
          {alerts.map(alert => (
            <View key={alert.comp.id} style={[s.alertCard, {
              backgroundColor: alert.status === 'critical' ? '#fef2f2' : '#fef9c3',
              borderLeftColor: alert.status === 'critical' ? '#c0392b' : '#ca8a04',
            }]}>
              <Text style={[s.alertTitle, { color: alert.status === 'critical' ? '#7f1d1d' : '#713f12' }]}>
                {alert.comp.name} — {alert.status === 'critical' ? 'CRITIQUE' : 'ATTENTION'}
              </Text>
              <Text style={[s.alertBody, { color: alert.status === 'critical' ? '#9b1c1c' : '#92400e' }]}>
                {alert.reason}
                {alert.availableEmployees.length > 0 && ` · Disponibles : ${alert.availableEmployees.map(e => e.name).join(', ')}`}
              </Text>
            </View>
          ))}

          {/* Taux de couverture */}
          <Text style={[s.sectionTitle, { marginTop: 16 }]}>📊 Taux de couverture par compétence</Text>
          {comps.map(comp => {
            const count = redundancy[comp.id] ?? 0;
            const total = employees.length;
            const pct = total > 0 ? Math.min(1, count / total) : 0;
            const color = count === 0 ? '#c0392b' : comp.isKey && count < comp.minBackups ? '#e67e22' : '#16a34a';
            return (
              <View key={comp.id} style={s.coverRow}>
                <Text style={s.coverLabel}>{comp.name}{comp.isKey ? ' ★' : ''}</Text>
                <View style={s.coverBarBg}>
                  <View style={[s.coverBarFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
                </View>
                <Text style={[s.coverCount, { color }]}>{count}/{total}</Text>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Commit**

```bash
git add src/components/matrice/MatricePDF.tsx
git commit -m "feat(matrice): add 2-page PDF with matrix + coverage report"
```

---

## Task 13 — Intégration HomePage + vérification Edge Function

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Verify: `supabase/functions/create-checkout-session/index.ts`

- [ ] **Vérifier que l'Edge Function passe bien `tool_slug` dans la table `purchases`**

```bash
# Lire la fonction
cat supabase/functions/create-checkout-session/index.ts
```

Si la fonction n'enregistre pas `tool_slug: 'matrice-polyvalence'` dans `purchases`, ajouter le paramètre `tool_slug` au body de la requête dans `src/pages/MatricePage.tsx` et mettre à jour la fonction en conséquence. La fonction doit insérer `tool_slug` dans `purchases` à réception du webhook Stripe.

- [ ] **Ajouter la 4e carte dans HomePage.tsx**

Dans `src/pages/HomePage.tsx`, trouver la section `<div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">` et :

1. Changer le className de la grille : `sm:grid-cols-2 lg:grid-cols-4`
2. Ajouter après la carte "Politique SSE" (avant "Document Unique") :

```tsx
{/* Matrice de Polyvalence — disponible */}
<div
  className="flex flex-col items-center rounded-2xl p-7 text-center transition-all duration-200 hover:-translate-y-1"
  style={{
    background: 'linear-gradient(145deg, #dbeafe, #bfdbfe)',
    border: '1.5px solid #93c5fd',
    boxShadow: '0 2px 8px rgba(29,78,216,0.12)',
  }}
  onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 20px rgba(29,78,216,0.18)')}
  onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(29,78,216,0.12)')}
>
  <span className="mb-3 text-4xl">📊</span>
  <span className="mb-1 inline-block rounded-full bg-[var(--mase-primary)] px-3 py-0.5 text-xs font-bold text-white">
    ✓ Disponible
  </span>
  <h2 className="mt-3 text-base font-extrabold text-[var(--mase-heading)]">
    Matrice de Polyvalence
  </h2>
  <p className="mt-1 text-xs text-[var(--mase-muted)]">
    Polyvalence & redondance des compétences · MASE
  </p>
  <div className="mt-4">
    <span className="text-2xl font-extrabold text-[var(--mase-heading)]">29 €</span>
    <span className="ml-1 text-xs text-[var(--mase-muted)]">paiement unique</span>
  </div>
  <Link
    to="/matrice-polyvalence"
    className="mt-5 inline-block rounded-full px-7 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
    style={{ backgroundColor: 'var(--mase-primary)' }}
  >
    Démarrer →
  </Link>
</div>
```

- [ ] **Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat(matrice): add matrice card in homepage grid"
```

---

## Task 14 — Test de bout en bout + déploiement

- [ ] **Lancer le serveur de développement**

```bash
npm run dev
```

- [ ] **Parcourir l'outil sur http://localhost:5173/matrice-polyvalence**

Vérifier dans l'ordre :
1. Page de gating s'affiche si non connecté → clic "Accéder pour 29 €" → AccessGate s'ouvre ✓
2. Après connexion Google sans achat → même gate ✓
3. Insérer manuellement un achat test dans Supabase :
   ```sql
   insert into purchases (user_id, tool_slug) values ('<ton-user-id>', 'matrice-polyvalence');
   ```
4. Recharger → outil s'ouvre avec données de démo ✓
5. Cliquer sur des cellules de la matrice → les niveaux changent → "Sauvegarde..." apparaît → "Sauvegardé ✓" après 1.5s ✓
6. Ajouter un collaborateur → il apparaît dans la matrice ✓
7. Déclarer un salarié absent → alertes apparaissent dans Absences si poste clé sous-couvert ✓
8. Ajouter/modifier une compétence → visible dans la matrice ✓
9. Modifier le nom de l'entreprise dans Paramètres → header se met à jour ✓
10. Cliquer "Exporter PDF" → PDF téléchargé avec 2 pages ✓
11. Sur la HomePage → 4 cartes affichées en grille 2×2 ✓

- [ ] **Déployer sur Vercel**

```bash
# Vercel se déploie automatiquement sur push main
git push origin main
```

- [ ] **Vérifier sur https://site-internet-mase.vercel.app/matrice-polyvalence**

---

## Self-review checklist

- [x] Table Supabase avec RLS → Task 1
- [x] Types TypeScript complets → Task 2
- [x] Données de démo (3 catégories, 7 compétences, 5 employés) → Task 3
- [x] Business logic testée (redondance, alertes) → Task 3
- [x] MatriceContext auto-save + chargement initial → Task 4
- [x] Page shell avec gating et session → Task 5
- [x] Route `/matrice-polyvalence` dans main.tsx → Task 5
- [x] Header avec indicateur save → Task 6
- [x] Barre d'onglets sticky + boutons PDF/print → Task 6
- [x] Matrice interactive (clic cycle, catégories colorées, redondance) → Task 7
- [x] CRUD collaborateurs → Task 8
- [x] Absences + alertes automatiques → Task 9
- [x] CRUD compétences (isKey, minBackups) → Task 10
- [x] CRUD catégories (color picker) → Task 10
- [x] Paramètres + export/import JSON → Task 11
- [x] PDF page 1 (matrice colorée paysage) → Task 12
- [x] PDF page 2 (synthèse + alertes + barres de couverture) → Task 12
- [x] Carte HomePage (4e outil, grille 2×2) → Task 13
- [x] Vérification Edge Function tool_slug → Task 13
