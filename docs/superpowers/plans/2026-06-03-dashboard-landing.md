# Dashboard Landing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer une page marketing à `/dashboard` visible par les visiteurs non connectés, avec préselection du plan à vie via `?plan=smi-lifetime`.

**Architecture:** `DashboardPage.tsx` reçoit une garde précoce `if (!session) return <DashboardLanding />` avant de déléguer à `DashboardGuard` existant. `DashboardLanding` est un composant presentationnel autonome. `DashboardPurchasePage` lit `?plan=smi-lifetime` en plus du `?pack=complet` existant.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, react-router-dom v6, Vitest, React Testing Library

---

## File Structure

| Action | Fichier | Responsabilité |
|---|---|---|
| Create | `src/components/dashboard/DashboardLanding.tsx` | Page marketing complète (nav, hero, modules, pricing) |
| Create | `src/components/dashboard/DashboardLanding.test.tsx` | Tests du composant landing |
| Modify | `src/pages/DashboardPage.tsx` | Garde `!session → <DashboardLanding />` |
| Create | `src/pages/DashboardPage.test.tsx` | Tests du routing session/no-session |
| Modify | `src/pages/DashboardPurchasePage.tsx` | Support `?plan=smi-lifetime` |
| Create | `src/pages/DashboardPurchasePage.test.tsx` | Tests préselection plan |

---

## Task 1 — DashboardPurchasePage : support `?plan=smi-lifetime`

**Files:**

- Modify: `src/pages/DashboardPurchasePage.tsx:62-63`
- Create: `src/pages/DashboardPurchasePage.test.tsx`

- [ ] **Step 1 — Écrire le test en échec**

Créer `src/pages/DashboardPurchasePage.test.tsx` :

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DashboardPurchasePage from './DashboardPurchasePage';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

function renderWithRoute(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/dashboard/acheter${search}`]}>
      <Routes>
        <Route
          path="/dashboard/acheter"
          element={<DashboardPurchasePage session={null} />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('DashboardPurchasePage — sélection initiale du plan', () => {
  it('pré-sélectionne smi-monthly par défaut', () => {
    renderWithRoute('');
    const button = screen.getByText('SMI Dashboard — Mensuel').closest('button');
    expect(button?.className).toMatch(/ring-2/);
  });

  it('pré-sélectionne pack-monthly avec ?pack=complet', () => {
    renderWithRoute('?pack=complet');
    const button = screen.getByText('Pack MASE Complet — Mensuel').closest('button');
    expect(button?.className).toMatch(/ring-2/);
  });

  it('pré-sélectionne smi-lifetime avec ?plan=smi-lifetime', () => {
    renderWithRoute('?plan=smi-lifetime');
    const button = screen.getByText('SMI Dashboard — À vie').closest('button');
    expect(button?.className).toMatch(/ring-2/);
  });
});
```

- [ ] **Step 2 — Lancer les tests pour vérifier l'échec**

```bash
npx vitest run src/pages/DashboardPurchasePage.test.tsx
```

Attendu : les deux premiers passent, le troisième échoue (smi-lifetime non sélectionné).

- [ ] **Step 3 — Implémenter le support `?plan=smi-lifetime`**

Dans `src/pages/DashboardPurchasePage.tsx`, remplacer les lignes 62-63 :

```tsx
// avant
const isPack = searchParams.get('pack') === 'complet';
const [selectedPlan, setSelectedPlan] = useState<Plan>(isPack ? 'pack-monthly' : 'smi-monthly');
```

par :

```tsx
const isPack = searchParams.get('pack') === 'complet';
const planParam = searchParams.get('plan') as Plan | null;
const validPlans: Plan[] = ['smi-monthly', 'smi-lifetime', 'pack-monthly', 'pack-lifetime'];
const initialPlan: Plan =
  planParam && validPlans.includes(planParam)
    ? planParam
    : isPack
    ? 'pack-monthly'
    : 'smi-monthly';
const [selectedPlan, setSelectedPlan] = useState<Plan>(initialPlan);
```

- [ ] **Step 4 — Vérifier que les tests passent**

```bash
npx vitest run src/pages/DashboardPurchasePage.test.tsx
```

Attendu : 3/3 PASS.

- [ ] **Step 5 — Commit**

```bash
git add src/pages/DashboardPurchasePage.tsx src/pages/DashboardPurchasePage.test.tsx
git commit -m "feat(dashboard): pré-sélection plan via ?plan=smi-lifetime"
```

---

## Task 2 — Créer DashboardLanding

**Files:**

- Create: `src/components/dashboard/DashboardLanding.tsx`
- Create: `src/components/dashboard/DashboardLanding.test.tsx`

- [ ] **Step 1 — Écrire les tests en échec**

Créer `src/components/dashboard/DashboardLanding.test.tsx` :

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardLanding } from './DashboardLanding';

vi.mock('../AuthButton', () => ({
  AuthButton: () => <button>Se connecter</button>,
}));

function renderLanding() {
  return render(
    <MemoryRouter>
      <DashboardLanding />
    </MemoryRouter>
  );
}

describe('DashboardLanding', () => {
  it('affiche le titre principal', () => {
    renderLanding();
    expect(screen.getByText(/Pilotez votre SMI/)).toBeInTheDocument();
  });

  it('affiche les 12 modules', () => {
    renderLanding();
    expect(screen.getByText('DUERP')).toBeInTheDocument();
    expect(screen.getByText('Habilitations')).toBeInTheDocument();
    expect(screen.getByText('Cockpit COMEX')).toBeInTheDocument();
  });

  it('CTA mensuel pointe vers /dashboard/acheter', () => {
    renderLanding();
    const link = screen.getByRole('link', { name: /15 €\/mois/ });
    expect(link).toHaveAttribute('href', '/dashboard/acheter');
  });

  it('CTA à vie pointe vers /dashboard/acheter?plan=smi-lifetime', () => {
    renderLanding();
    const links = screen.getAllByRole('link', { name: /299 €/ });
    expect(links[0]).toHaveAttribute('href', '/dashboard/acheter?plan=smi-lifetime');
  });

  it('lien retour accueil pointe vers /', () => {
    renderLanding();
    const link = screen.getByRole('link', { name: /Accueil/ });
    expect(link).toHaveAttribute('href', '/');
  });
});
```

- [ ] **Step 2 — Lancer les tests pour vérifier l'échec**

```bash
npx vitest run src/components/dashboard/DashboardLanding.test.tsx
```

Attendu : FAIL (module inexistant).

- [ ] **Step 3 — Créer DashboardLanding.tsx**

Créer `src/components/dashboard/DashboardLanding.tsx` :

```tsx
import { Link } from 'react-router-dom';
import { AuthButton } from '../AuthButton';

const MODULES = [
  { icon: '📊', name: 'Cockpit COMEX', desc: 'Score global' },
  { icon: '📋', name: 'DUERP', desc: 'Registre des risques' },
  { icon: '✅', name: "Plan d'actions", desc: 'PDCA' },
  { icon: '🚨', name: 'Accidents', desc: 'Déclaration & suivi' },
  { icon: '🎓', name: 'Habilitations', desc: "Alertes d'expiration" },
  { icon: '📈', name: 'KPIs Sécurité', desc: 'TF, TG, heures' },
  { icon: '🏛️', name: 'Revue Direction', desc: 'Comptes-rendus' },
  { icon: '🎯', name: 'Objectifs QHSE', desc: 'Suivi annuel' },
  { icon: '🔍', name: 'Audits Qualité', desc: 'Résultats & écarts' },
  { icon: '👥', name: 'Social RH', desc: 'AT, formations' },
  { icon: '📅', name: 'Réunions QHSE', desc: 'CSE, SST…' },
  { icon: '📦', name: 'Export / Archives', desc: 'Excel + PDF' },
];

export function DashboardLanding() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f3' }}>

      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-3"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        <span className="text-lg font-bold text-white">MASE</span>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm text-white/70 transition hover:text-white">
            ← Accueil
          </Link>
          <AuthButton session={null} />
        </div>
      </nav>

      {/* Hero */}
      <section
        className="px-6 py-20 text-center"
        style={{ background: 'linear-gradient(135deg, #6d28d9, #4c1d95)' }}
      >
        <span
          className="mb-4 inline-block rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white"
          style={{
            backgroundColor: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          🏭 SMI Dashboard QHSE
        </span>
        <h1 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">
          Pilotez votre SMI<br />en un seul endroit
        </h1>
        <p className="mt-4 text-base text-white/70">
          12 modules QHSE intégrés · Conforme MASE V2024 · Multi-utilisateurs
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/dashboard/acheter"
            className="rounded-full px-8 py-3 text-sm font-bold transition hover:opacity-90"
            style={{ backgroundColor: 'white', color: '#7c3aed' }}
          >
            Démarrer à 15 €/mois →
          </Link>
          <Link
            to="/dashboard/acheter?plan=smi-lifetime"
            className="rounded-full px-8 py-3 text-sm font-bold text-white transition hover:opacity-90"
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            299 € accès à vie
          </Link>
        </div>
      </section>

      {/* 12 modules */}
      <section className="px-6 py-14" style={{ backgroundColor: 'var(--mase-card-strong)' }}>
        <p className="mb-10 text-center text-xs font-bold uppercase tracking-widest text-[var(--mase-muted)]">
          12 modules inclus
        </p>
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {MODULES.map(({ icon, name, desc }) => (
            <div
              key={name}
              className="rounded-2xl bg-white p-4 text-center shadow-sm"
            >
              <div className="text-2xl">{icon}</div>
              <div className="mt-2 text-sm font-bold text-[var(--mase-heading)]">{name}</div>
              <div className="mt-0.5 text-xs text-[var(--mase-muted)]">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white px-6 py-14">
        <p className="mb-10 text-center text-xs font-bold uppercase tracking-widest text-[var(--mase-muted)]">
          Tarifs
        </p>
        <div className="mx-auto grid max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
          <div
            className="rounded-2xl p-6 text-center"
            style={{ border: '1.5px solid #a78bfa' }}
          >
            <div className="text-2xl font-extrabold text-[var(--mase-heading)]">15 €</div>
            <div className="text-xs text-[var(--mase-muted)]">/mois · résiliable</div>
            <Link
              to="/dashboard/acheter"
              className="mt-4 inline-block w-full rounded-full py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: '#7c3aed' }}
            >
              Choisir →
            </Link>
          </div>
          <div
            className="relative rounded-2xl p-6 text-center"
            style={{ border: '2px solid #f59e0b' }}
          >
            <span
              className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-bold text-white"
              style={{ backgroundColor: '#f59e0b', whiteSpace: 'nowrap' }}
            >
              ⭐ BEST VALUE
            </span>
            <div className="text-2xl font-extrabold text-[var(--mase-heading)]">299 €</div>
            <div className="text-xs text-[var(--mase-muted)]">accès à vie</div>
            <Link
              to="/dashboard/acheter?plan=smi-lifetime"
              className="mt-4 inline-block w-full rounded-full py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: '#f59e0b' }}
            >
              Choisir →
            </Link>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          Paiement sécurisé Stripe · Multi-utilisateurs inclus
        </p>
      </section>

      {/* Footer */}
      <footer
        className="px-6 py-4 text-center"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        <span className="text-xs text-white/40">
          © 2026 MASE Tools — Toute la documentation certifiante.
        </span>
      </footer>

    </div>
  );
}
```

- [ ] **Step 4 — Vérifier que les tests passent**

```bash
npx vitest run src/components/dashboard/DashboardLanding.test.tsx
```

Attendu : 5/5 PASS.

- [ ] **Step 5 — Commit**

```bash
git add src/components/dashboard/DashboardLanding.tsx src/components/dashboard/DashboardLanding.test.tsx
git commit -m "feat(dashboard): composant DashboardLanding — page marketing /dashboard"
```

---

## Task 3 — Câbler DashboardLanding dans DashboardPage

**Files:**

- Modify: `src/pages/DashboardPage.tsx`
- Create: `src/pages/DashboardPage.test.tsx`

- [ ] **Step 1 — Écrire les tests en échec**

Créer `src/pages/DashboardPage.test.tsx` :

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage';

vi.mock('../components/dashboard/DashboardGuard', () => ({
  DashboardGuard: () => <div>Cockpit COMEX</div>,
}));

vi.mock('../components/dashboard/DashboardLanding', () => ({
  DashboardLanding: () => <div>Page marketing landing</div>,
}));

describe('DashboardPage', () => {
  it('affiche la landing quand session est null', () => {
    render(
      <MemoryRouter>
        <DashboardPage session={null} />
      </MemoryRouter>
    );
    expect(screen.getByText('Page marketing landing')).toBeInTheDocument();
    expect(screen.queryByText('Cockpit COMEX')).not.toBeInTheDocument();
  });

  it('passe par DashboardGuard quand session existe', () => {
    const fakeSession = { user: { id: 'u1', email: 'x@y.com' } } as any;
    render(
      <MemoryRouter>
        <DashboardPage session={fakeSession} />
      </MemoryRouter>
    );
    expect(screen.getByText('Cockpit COMEX')).toBeInTheDocument();
    expect(screen.queryByText('Page marketing landing')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2 — Lancer les tests pour vérifier l'échec**

```bash
npx vitest run src/pages/DashboardPage.test.tsx
```

Attendu : le test "affiche la landing quand session est null" échoue (actuellement `DashboardGuard` redirige vers `/`).

- [ ] **Step 3 — Modifier DashboardPage.tsx**

Remplacer le contenu de `src/pages/DashboardPage.tsx` par :

```tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { DashboardLanding } from '../components/dashboard/DashboardLanding';
import { useCompany } from '../hooks/useCompany';
import DashboardComex from '../dashboard/DashboardComex';

interface Props { session: Session | null; }

function ComexContent({ session }: Props) {
  const { company } = useCompany(session);
  if (!company) return null;
  return <DashboardComex companyId={company.id} />;
}

export default function DashboardPage({ session }: Props) {
  if (!session) return <DashboardLanding />;
  return (
    <DashboardGuard session={session}>
      <ComexContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] **Step 4 — Vérifier que les tests passent**

```bash
npx vitest run src/pages/DashboardPage.test.tsx
```

Attendu : 2/2 PASS.

- [ ] **Step 5 — Suite de tests complète**

```bash
npx vitest run
```

Attendu : tous les tests existants passent encore (pas de régression).

- [ ] **Step 6 — Commit final**

```bash
git add src/pages/DashboardPage.tsx src/pages/DashboardPage.test.tsx
git commit -m "feat(dashboard): /dashboard affiche la landing pour les visiteurs non connectés"
```
