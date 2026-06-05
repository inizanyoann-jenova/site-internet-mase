# Cartographie des Processus — Plan B : Phase 1 Wizard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter le wizard Phase 1 complet — 8 étapes guidées permettant à l'utilisateur de construire sa cartographie des processus, avec aperçu visuel interactif et export PDF au format standard MASE.

**Architecture:** Un composant orchestrateur `Phase1Wizard` gère l'état global (ProcessMap partiel) et le passe à chaque étape via props. Chaque étape se valide et déclenche un `saveMap()` Supabase avant de passer à la suivante. L'aperçu `MapPreview` est un composant React pur (CSS flexbox) qui reflète le format MASE standard. Le PDF est généré côté client avec `@react-pdf/renderer`.

**Tech Stack:** React 19 + TypeScript + Tailwind v4 + Supabase (via `useCartographie`) + `@react-pdf/renderer` + types depuis `src/types/cartographie.ts`

**Prérequis Plan A :** `src/types/cartographie.ts`, `src/hooks/useCartographie.ts`, `src/pages/CartographieLandingPage.tsx`, route `/cartographie` existante.

**Spec :** `docs/superpowers/specs/2026-06-04-cartographie-processus-design.md`

---

## File Structure

```text
src/
  pages/
    CartographieWizardPage.tsx         ← NOUVEAU — route /cartographie/wizard, auth guard
  components/
    cartographie/
      intro/
        IntroductionScreen.tsx         ← NOUVEAU — écran pédagogique avant wizard
      phase1/
        Phase1Wizard.tsx               ← NOUVEAU — orchestrateur state + navigation
        Step1Company.tsx               ← NOUVEAU — infos entreprise (5 champs)
        Step2AIGeneration.tsx          ← NOUVEAU — génération IA + fallback secteur
        Step3Pilotage.tsx              ← NOUVEAU — saisie processus pilotage
        Step4Realisation.tsx           ← NOUVEAU — saisie processus réalisation
        Step5Support.tsx               ← NOUVEAU — saisie processus support
        Step6Validation.tsx            ← NOUVEAU — contrôle cohérence automatique
        Step7Preview.tsx               ← NOUVEAU — aperçu interactif cartographie
        Step8Export.tsx                ← NOUVEAU — export PDF + invitation Phase 2
      shared/
        WizardProgress.tsx             ← NOUVEAU — barre de progression 8 étapes
        MapPreview.tsx                 ← NOUVEAU — rendu visuel cartographie (CSS)
        ProcessFormRow.tsx             ← NOUVEAU — ligne de saisie processus réutilisable
  engine/
    cartographie/
      renderCartographyPdf.tsx         ← NOUVEAU — PDF @react-pdf/renderer

src/main.tsx                           ← MODIFIÉ — ajouter route /cartographie/wizard
```

---

## Task 1 : CartographieWizardPage + WizardProgress + route

**Files:**
- Create: `src/pages/CartographieWizardPage.tsx`
- Create: `src/components/cartographie/shared/WizardProgress.tsx`
- Modify: `src/main.tsx`
- Create: `src/pages/CartographieWizardPage.test.tsx`

- [ ] **Étape 1 : Écrire le test**

```tsx
// src/pages/CartographieWizardPage.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CartographieWizardPage from './CartographieWizardPage';

vi.mock('../contexts/SessionContext', () => ({
  SessionContext: { Consumer: ({ children }: any) => children(null) },
  useSession: () => null,
}));
vi.mock('../hooks/useCartographie', () => ({
  useCartographie: () => ({
    map: null, isLoading: false, error: null,
    saveMap: vi.fn(), saveSheet: vi.fn(), getSheets: vi.fn(),
    callGenerateProcessMap: vi.fn(), callReformulateSmart: vi.fn(),
    callAiAssist: vi.fn(), refetch: vi.fn(),
  }),
}));

describe('CartographieWizardPage', () => {
  it('redirige vers /cartographie si pas de session', () => {
    const { container } = render(
      <MemoryRouter><CartographieWizardPage /></MemoryRouter>
    );
    // Sans session, affiche un message de connexion ou redirige
    expect(container).toBeDefined();
  });
});
```

- [ ] **Étape 2 : Lancer le test — vérifier qu'il échoue**

```bash
npx vitest run src/pages/CartographieWizardPage.test.tsx
```

Résultat attendu : `FAIL — cannot find module`

- [ ] **Étape 3 : Créer WizardProgress**

```tsx
// src/components/cartographie/shared/WizardProgress.tsx
interface Props {
  currentStep: number; // 1-8
  totalSteps: number;
}

const STEP_LABELS = [
  'Entreprise', 'Modèle IA', 'Pilotage',
  'Réalisation', 'Support', 'Validation',
  'Aperçu', 'Export',
];

export default function WizardProgress({ currentStep, totalSteps }: Props) {
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
        <span>Étape {currentStep} sur {totalSteps}</span>
        <span className="font-semibold text-gray-700">
          {STEP_LABELS[currentStep - 1]}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${(currentStep / totalSteps) * 100}%`,
            backgroundColor: 'var(--mase-primary)',
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Étape 4 : Créer CartographieWizardPage**

```tsx
// src/pages/CartographieWizardPage.tsx
import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { SessionContext } from '../contexts/SessionContext';
import { supabase } from '../lib/supabase';
import { useCartographie } from '../hooks/useCartographie';
import IntroductionScreen from '../components/cartographie/intro/IntroductionScreen';
import Phase1Wizard from '../components/cartographie/phase1/Phase1Wizard';

type Screen = 'loading' | 'no-access' | 'intro' | 'phase1';

export default function CartographieWizardPage() {
  const session = useContext(SessionContext) as Session | null;
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('loading');
  const cartographie = useCartographie(session);

  useEffect(() => {
    if (!session) { navigate('/cartographie'); return; }
    supabase
      .from('purchases')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('tool_slug', 'cartographie-processus')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setScreen('no-access'); return; }
        // Si phase1 déjà complète, aller directement en phase1 (reprise)
        setScreen(cartographie.map?.phase1Completed ? 'phase1' : 'intro');
      });
  }, [session, navigate, cartographie.map]);

  if (screen === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Chargement…</div>
      </div>
    );
  }

  if (screen === 'no-access') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-gray-600">Vous n'avez pas accès à cet outil.</p>
        <a
          href="/cartographie"
          className="rounded-lg px-6 py-2 text-sm font-bold text-white"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          Voir les offres →
        </a>
      </div>
    );
  }

  if (screen === 'intro') {
    return <IntroductionScreen onStart={() => setScreen('phase1')} />;
  }

  return (
    <Phase1Wizard
      session={session!}
      cartographie={cartographie}
    />
  );
}
```

- [ ] **Étape 5 : Ajouter la route dans src/main.tsx**

Dans `src/main.tsx`, ajouter l'import :
```typescript
import CartographieWizardPage from './pages/CartographieWizardPage';
```

Ajouter la route après `/cartographie` :
```tsx
<Route path="/cartographie/wizard" element={<CartographieWizardPage />} />
```

- [ ] **Étape 6 : Lancer le test**

```bash
npx vitest run src/pages/CartographieWizardPage.test.tsx
```

Résultat attendu : `1 passed`

- [ ] **Étape 7 : Vérifier le build TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Résultat attendu : aucune erreur (les imports manquants seront créés dans les tâches suivantes — ignorer les erreurs de modules manquants pour l'instant).

- [ ] **Étape 8 : Commit**

```bash
git add src/pages/CartographieWizardPage.tsx src/pages/CartographieWizardPage.test.tsx src/components/cartographie/shared/WizardProgress.tsx src/main.tsx
git commit -m "feat(cartographie): route /cartographie/wizard + guard accès + WizardProgress"
```

---

## Task 2 : IntroductionScreen

**Files:**
- Create: `src/components/cartographie/intro/IntroductionScreen.tsx`

- [ ] **Étape 1 : Créer le composant**

```tsx
// src/components/cartographie/intro/IntroductionScreen.tsx
interface Props {
  onStart: () => void;
}

const CONCEPTS = [
  {
    emoji: '🗺️',
    title: 'La cartographie',
    desc: "C'est la carte de votre entreprise. Elle montre toutes vos activités et comment elles s'enchaînent entre elles.",
  },
  {
    emoji: '⚙️',
    title: 'Un processus',
    desc: "C'est une activité qui transforme quelque chose en entrée (une demande, un document) en quelque chose en sortie (un résultat, un livrable).",
  },
  {
    emoji: '🏢',
    title: 'Les processus métier',
    desc: "Ce sont vos activités principales — celles pour lesquelles vos clients vous paient. C'est votre \"cœur de métier\".",
  },
];

const EXAMPLE = "Exemple BTP : Votre client envoie un appel d'offre → vous faites un devis → vous réalisez le chantier → vous livrez les travaux. Chacune de ces étapes est un processus !";

export default function IntroductionScreen({ onStart }: Props) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f3' }}>
      {/* Nav */}
      <nav
        className="flex items-center px-6 py-3"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        <a href="/" className="text-lg font-bold text-white">MASE</a>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Hero */}
        <div className="mb-10 text-center">
          <div className="mb-4 text-5xl">🗺️</div>
          <h1 className="mb-3 text-2xl font-extrabold text-gray-900">
            Bienvenue dans le générateur de Cartographie des Processus
          </h1>
          <p className="text-gray-500">
            Pas de panique — on vous guide étape par étape.<br />
            Comptez environ <strong>45 à 60 minutes</strong> pour tout compléter.
          </p>
        </div>

        {/* 3 concepts */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">
            Avant de commencer, 3 notions clés à connaître
          </h2>
          <div className="flex flex-col gap-4">
            {CONCEPTS.map((c) => (
              <div key={c.title} className="flex gap-4">
                <span className="text-2xl">{c.emoji}</span>
                <div>
                  <div className="font-bold text-gray-800">{c.title}</div>
                  <div className="text-sm text-gray-500">{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exemple concret */}
        <div
          className="mb-8 rounded-xl p-5"
          style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}
        >
          <div className="mb-1 text-xs font-bold uppercase tracking-wider text-blue-600">
            💡 Exemple concret
          </div>
          <p className="text-sm text-blue-900">{EXAMPLE}</p>
        </div>

        {/* Ce qui va se passer */}
        <div className="mb-10 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">
            Les 2 phases de l'outil
          </h2>
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--mase-primary)' }}
              >1</div>
              <div>
                <div className="font-semibold text-gray-800">Construire votre carte (~20 min)</div>
                <div className="text-sm text-gray-500">
                  Vous identifiez tous vos processus et comment ils s'enchaînent. Résultat : une cartographie PDF au format MASE.
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: '#16a34a' }}
              >2</div>
              <div>
                <div className="font-semibold text-gray-800">Détailler chaque processus (~30 min)</div>
                <div className="text-sm text-gray-500">
                  Pour chaque processus, vous renseignez les détails (pilote, objectif SMART, risques…). Résultat : des fiches de processus PDF conformes MASE.
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onStart}
          className="w-full rounded-xl py-4 text-base font-bold text-white shadow-md transition hover:opacity-90"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          Je comprends, on commence la Phase 1 →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Étape 2 : Commit**

```bash
git add src/components/cartographie/intro/IntroductionScreen.tsx
git commit -m "feat(cartographie): écran d'introduction pédagogique"
```

---

## Task 3 : Phase1Wizard — orchestrateur d'état

**Files:**
- Create: `src/components/cartographie/phase1/Phase1Wizard.tsx`

- [ ] **Étape 1 : Créer l'orchestrateur**

```tsx
// src/components/cartographie/phase1/Phase1Wizard.tsx
import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { ProcessMap, ProcessDefinition } from '../../../types/cartographie';
import type { useCartographie } from '../../../hooks/useCartographie';
import WizardProgress from '../shared/WizardProgress';
import Step1Company from './Step1Company';
import Step2AIGeneration from './Step2AIGeneration';
import Step3Pilotage from './Step3Pilotage';
import Step4Realisation from './Step4Realisation';
import Step5Support from './Step5Support';
import Step6Validation from './Step6Validation';
import Step7Preview from './Step7Preview';
import Step8Export from './Step8Export';

type CartographieHook = ReturnType<typeof useCartographie>;

interface Props {
  session: Session;
  cartographie: CartographieHook;
}

export interface Phase1State {
  companyName: string;
  sector: string;
  city: string;
  headcount: number;
  sseManagerName: string;
  sseManagerRole: string;
  documentDate: string;
  processes: ProcessDefinition[];
  aiSource?: 'web_search' | 'sector_model';
  aiSourceSummary?: string;
  savedMapId?: string;
}

const EMPTY_STATE: Phase1State = {
  companyName: '',
  sector: '',
  city: '',
  headcount: 0,
  sseManagerName: '',
  sseManagerRole: '',
  documentDate: new Date().toISOString().split('T')[0],
  processes: [],
};

function mapToPhase1State(map: ProcessMap): Phase1State {
  return {
    companyName: map.companyName,
    sector: map.sector,
    city: '',
    headcount: map.headcount,
    sseManagerName: map.sseManagerName,
    sseManagerRole: map.sseManagerRole,
    documentDate: map.documentDate,
    processes: map.cartographyData.processes,
    savedMapId: map.id,
  };
}

export default function Phase1Wizard({ session, cartographie }: Props) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<Phase1State>(EMPTY_STATE);
  const [isSaving, setIsSaving] = useState(false);

  // Pré-remplir depuis les données Supabase existantes
  useEffect(() => {
    if (cartographie.map) {
      setState(mapToPhase1State(cartographie.map));
      if (cartographie.map.phase1Completed) setStep(7);
    }
  }, [cartographie.map]);

  const update = (patch: Partial<Phase1State>) =>
    setState((prev) => ({ ...prev, ...patch }));

  const saveAndNext = async (patch?: Partial<Phase1State>) => {
    const next = patch ? { ...state, ...patch } : state;
    setState(next);
    setIsSaving(true);
    try {
      const saved = await cartographie.saveMap({
        id: next.savedMapId,
        companyName: next.companyName,
        sector: next.sector,
        headcount: next.headcount,
        sseManagerName: next.sseManagerName,
        sseManagerRole: next.sseManagerRole,
        documentDate: next.documentDate,
        cartographyData: { processes: next.processes },
        phase1Completed: step === 8,
        phase2Completed: false,
      });
      if (!next.savedMapId) {
        setState((prev) => ({ ...prev, savedMapId: saved.id }));
      }
    } catch (e) {
      console.error('Erreur sauvegarde:', e);
    } finally {
      setIsSaving(false);
    }
    setStep((s) => Math.min(s + 1, 8));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const stepProps = { state, update, onNext: saveAndNext, onBack: goBack, isSaving, cartographie };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f3' }}>
      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-3"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        <a href="/" className="text-lg font-bold text-white">MASE</a>
        <span className="text-sm text-white/70">{session.user.email}</span>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-8">
          <WizardProgress currentStep={step} totalSteps={8} />
        </div>

        {step === 1 && <Step1Company {...stepProps} />}
        {step === 2 && <Step2AIGeneration {...stepProps} />}
        {step === 3 && <Step3Pilotage {...stepProps} />}
        {step === 4 && <Step4Realisation {...stepProps} />}
        {step === 5 && <Step5Support {...stepProps} />}
        {step === 6 && <Step6Validation {...stepProps} />}
        {step === 7 && <Step7Preview {...stepProps} />}
        {step === 8 && <Step8Export {...stepProps} />}
      </div>
    </div>
  );
}
```

- [ ] **Étape 2 : Commit**

```bash
git add src/components/cartographie/phase1/Phase1Wizard.tsx
git commit -m "feat(cartographie): Phase1Wizard orchestrateur état + navigation"
```

---

## Task 4 : Step1Company + Step2AIGeneration

**Files:**
- Create: `src/components/cartographie/phase1/Step1Company.tsx`
- Create: `src/components/cartographie/phase1/Step2AIGeneration.tsx`

Les deux steps partagent le même pattern de props — défini dans Phase1Wizard et réutilisé.

- [ ] **Étape 1 : Créer le type partagé des props de step**

Ajouter au début de `src/components/cartographie/phase1/Phase1Wizard.tsx` (export pour les steps) :

```typescript
export interface StepProps {
  state: Phase1State;
  update: (patch: Partial<Phase1State>) => void;
  onNext: (patch?: Partial<Phase1State>) => Promise<void>;
  onBack: () => void;
  isSaving: boolean;
  cartographie: CartographieHook;
}
```

- [ ] **Étape 2 : Créer Step1Company**

```tsx
// src/components/cartographie/phase1/Step1Company.tsx
import type { StepProps } from './Phase1Wizard';

export default function Step1Company({ state, update, onNext, isSaving }: StepProps) {
  const canNext = state.companyName.trim() && state.sector.trim() && state.sseManagerName.trim();

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-xl font-bold text-gray-900">Votre entreprise</h2>
      <p className="mb-6 text-sm text-gray-500">
        Ces informations apparaîtront sur vos documents MASE.
      </p>

      <div className="flex flex-col gap-5">
        <Field label="Nom de l'entreprise *" required>
          <input
            type="text"
            value={state.companyName}
            onChange={(e) => update({ companyName: e.target.value })}
            placeholder="Ex: Dupont TP SARL"
            className="input-field"
          />
        </Field>

        <Field label="Secteur d'activité principal *" required>
          <input
            type="text"
            value={state.sector}
            onChange={(e) => update({ sector: e.target.value })}
            placeholder="Ex: BTP — Terrassement et travaux publics"
            className="input-field"
          />
        </Field>

        <Field label="Ville / Région">
          <input
            type="text"
            value={state.city}
            onChange={(e) => update({ city: e.target.value })}
            placeholder="Ex: Lyon (69)"
            className="input-field"
          />
          <p className="mt-1 text-xs text-gray-400">
            Utilisée par l'IA pour rechercher votre entreprise en ligne.
          </p>
        </Field>

        <Field label="Effectif (nombre de salariés)">
          <input
            type="number"
            min={0}
            value={state.headcount || ''}
            onChange={(e) => update({ headcount: parseInt(e.target.value) || 0 })}
            placeholder="Ex: 25"
            className="input-field"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Nom du responsable SSE / Qualité *" required>
            <input
              type="text"
              value={state.sseManagerName}
              onChange={(e) => update({ sseManagerName: e.target.value })}
              placeholder="Ex: Marie Martin"
              className="input-field"
            />
          </Field>
          <Field label="Poste / Fonction *" required>
            <input
              type="text"
              value={state.sseManagerRole}
              onChange={(e) => update({ sseManagerRole: e.target.value })}
              placeholder="Ex: Responsable SSE"
              className="input-field"
            />
          </Field>
        </div>

        <Field label="Date du document">
          <input
            type="date"
            value={state.documentDate}
            onChange={(e) => update({ documentDate: e.target.value })}
            className="input-field"
          />
        </Field>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={() => onNext()}
          disabled={!canNext || isSaving}
          className="rounded-lg px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {isSaving ? 'Sauvegarde…' : 'Étape suivante →'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children, required }: {
  label: string; children: React.ReactNode; required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}
```

- [ ] **Étape 3 : Ajouter le style `input-field` dans `src/index.css`**

Dans `src/index.css`, ajouter (après les styles existants) :

```css
.input-field {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s;
}
.input-field:focus {
  border-color: var(--mase-primary);
  box-shadow: 0 0 0 2px rgba(30, 77, 123, 0.15);
}
```

- [ ] **Étape 4 : Créer Step2AIGeneration**

```tsx
// src/components/cartographie/phase1/Step2AIGeneration.tsx
import { useState } from 'react';
import type { StepProps } from './Phase1Wizard';
import type { ProcessDefinition } from '../../../types/cartographie';

const SECTOR_TEMPLATES: Record<string, ProcessDefinition[]> = {
  btp: [
    { id: 'p1', type: 'pilotage', name: 'Direction générale', pilotName: '(à compléter)', pilotRole: 'Dirigeant', role: 'Définir la stratégie et les objectifs de l\'entreprise' },
    { id: 'p2', type: 'pilotage', name: 'Amélioration continue', pilotName: '(à compléter)', pilotRole: 'Responsable SSE', role: 'Piloter les actions correctives et préventives' },
    { id: 'p3', type: 'realisation', name: 'Réponse aux appels d\'offre', pilotName: '(à compléter)', pilotRole: 'Chef de projet', inputElement: 'Appel d\'offre client', outputElement: 'Devis / offre de prix' },
    { id: 'p4', type: 'realisation', name: 'Préparation chantier', pilotName: '(à compléter)', pilotRole: 'Chef de chantier', inputElement: 'Devis accepté', outputElement: 'Plan de prévention + planning', afterProcessId: 'p3' },
    { id: 'p5', type: 'realisation', name: 'Exécution des travaux', pilotName: '(à compléter)', pilotRole: 'Chef de chantier', inputElement: 'Plan de prévention', outputElement: 'Travaux réalisés + PV', afterProcessId: 'p4' },
    { id: 'p6', type: 'realisation', name: 'Réception et clôture', pilotName: '(à compléter)', pilotRole: 'Chef de projet', inputElement: 'Travaux réalisés', outputElement: 'PV de réception signé', afterProcessId: 'p5' },
    { id: 'p7', type: 'support', name: 'Ressources Humaines', pilotName: '(à compléter)', pilotRole: 'RRH', linkedRealisationIds: ['p4', 'p5'] },
    { id: 'p8', type: 'support', name: 'Matériel et équipements', pilotName: '(à compléter)', pilotRole: 'Responsable matériel', linkedRealisationIds: ['p5'] },
    { id: 'p9', type: 'support', name: 'SSE et prévention', pilotName: '(à compléter)', pilotRole: 'Responsable SSE', linkedRealisationIds: ['p3', 'p4', 'p5'] },
    { id: 'p10', type: 'support', name: 'Achats et fournisseurs', pilotName: '(à compléter)', pilotRole: 'Acheteur', linkedRealisationIds: ['p4', 'p5'] },
  ],
  maintenance: [
    { id: 'p1', type: 'pilotage', name: 'Direction générale', pilotName: '(à compléter)', pilotRole: 'Dirigeant', role: 'Définir la stratégie et les objectifs' },
    { id: 'p2', type: 'pilotage', name: 'Amélioration continue', pilotName: '(à compléter)', pilotRole: 'Responsable qualité', role: 'Gérer les non-conformités et actions correctives' },
    { id: 'p3', type: 'realisation', name: 'Prise en charge demande', pilotName: '(à compléter)', pilotRole: 'Responsable planning', inputElement: 'Demande d\'intervention', outputElement: 'Bon d\'intervention créé' },
    { id: 'p4', type: 'realisation', name: 'Diagnostic et préparation', pilotName: '(à compléter)', pilotRole: 'Technicien senior', inputElement: 'Bon d\'intervention', outputElement: 'Diagnostic + matériel préparé', afterProcessId: 'p3' },
    { id: 'p5', type: 'realisation', name: 'Réalisation de la maintenance', pilotName: '(à compléter)', pilotRole: 'Technicien', inputElement: 'Diagnostic validé', outputElement: 'Intervention terminée', afterProcessId: 'p4' },
    { id: 'p6', type: 'realisation', name: 'Contrôle et validation', pilotName: '(à compléter)', pilotRole: 'Chef d\'équipe', inputElement: 'Intervention réalisée', outputElement: 'Rapport d\'intervention signé', afterProcessId: 'p5' },
    { id: 'p7', type: 'support', name: 'Ressources Humaines', pilotName: '(à compléter)', pilotRole: 'RRH', linkedRealisationIds: ['p4', 'p5'] },
    { id: 'p8', type: 'support', name: 'Outillage et pièces', pilotName: '(à compléter)', pilotRole: 'Magasinier', linkedRealisationIds: ['p4', 'p5'] },
    { id: 'p9', type: 'support', name: 'SSE et habilitations', pilotName: '(à compléter)', pilotRole: 'Responsable SSE', linkedRealisationIds: ['p3', 'p4', 'p5'] },
  ],
};

function getSectorTemplate(sector: string): ProcessDefinition[] {
  const lower = sector.toLowerCase();
  if (lower.includes('btp') || lower.includes('chantier') || lower.includes('construction') || lower.includes('travaux')) {
    return SECTOR_TEMPLATES.btp;
  }
  if (lower.includes('maintenance') || lower.includes('entretien')) {
    return SECTOR_TEMPLATES.maintenance;
  }
  return SECTOR_TEMPLATES.btp; // fallback
}

export default function Step2AIGeneration({ state, update, onNext, onBack, isSaving, cartographie }: StepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setAiError(null);
    try {
      const result = await cartographie.callGenerateProcessMap({
        companyName: state.companyName,
        sector: state.sector,
        city: state.city,
      });
      update({
        processes: result.processes.length > 0 ? result.processes : getSectorTemplate(state.sector),
        aiSource: result.source,
        aiSourceSummary: result.sourceSummary,
      });
      setGenerated(true);
    } catch {
      setAiError('La génération IA a échoué. Utilisation du modèle secteur.');
      update({ processes: getSectorTemplate(state.sector), aiSource: 'sector_model' });
      setGenerated(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseSectorModel = () => {
    update({ processes: getSectorTemplate(state.sector), aiSource: 'sector_model' });
    setGenerated(true);
  };

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-xl font-bold text-gray-900">
        Génération de votre cartographie
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        L'IA va chercher des infos sur <strong>{state.companyName}</strong> et créer
        un premier jet de cartographie que vous pourrez modifier ensuite.
      </p>

      {!generated && (
        <div className="flex flex-col gap-4">
          <button
            onClick={handleGenerateAI}
            disabled={isGenerating}
            className="flex items-center justify-center gap-3 rounded-xl border-2 p-5 text-left transition hover:shadow-md disabled:opacity-60"
            style={{ borderColor: 'var(--mase-primary)' }}
          >
            {isGenerating ? (
              <>
                <span className="text-2xl animate-spin">⏳</span>
                <div>
                  <div className="font-bold" style={{ color: 'var(--mase-primary)' }}>
                    Recherche en cours…
                  </div>
                  <div className="text-sm text-gray-500">
                    L'IA cherche des infos sur {state.companyName} et génère votre cartographie (30–60 sec)
                  </div>
                </div>
              </>
            ) : (
              <>
                <span className="text-2xl">✨</span>
                <div>
                  <div className="font-bold" style={{ color: 'var(--mase-primary)' }}>
                    Rechercher {state.companyName} et générer avec l'IA
                  </div>
                  <div className="text-sm text-gray-500">
                    L'IA recherche votre entreprise en ligne et crée un premier jet personnalisé
                  </div>
                </div>
              </>
            )}
          </button>

          {!isGenerating && (
            <button
              onClick={handleUseSectorModel}
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-5 text-left transition hover:bg-gray-50"
            >
              <span className="text-2xl">📋</span>
              <div>
                <div className="font-bold text-gray-700">Utiliser un modèle type {state.sector}</div>
                <div className="text-sm text-gray-500">
                  Partir d'une cartographie pré-remplie pour votre secteur, sans recherche internet
                </div>
              </div>
            </button>
          )}
        </div>
      )}

      {generated && (
        <div>
          {state.aiSource === 'web_search' && state.aiSourceSummary && (
            <div className="mb-4 rounded-lg p-4" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div className="mb-1 text-xs font-bold text-green-700">✓ Entreprise trouvée en ligne</div>
              <div className="text-sm text-green-900">{state.aiSourceSummary}</div>
            </div>
          )}
          {aiError && (
            <div className="mb-4 rounded-lg bg-yellow-50 p-4" style={{ border: '1px solid #fde68a' }}>
              <div className="text-sm text-yellow-800">{aiError}</div>
            </div>
          )}
          <div className="rounded-lg bg-gray-50 p-4" style={{ border: '1px solid #e5e7eb' }}>
            <div className="mb-3 text-sm font-semibold text-gray-700">
              {state.processes.length} processus générés :
            </div>
            <div className="flex flex-col gap-1">
              {state.processes.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <span className={
                    p.type === 'pilotage' ? 'text-blue-600' :
                    p.type === 'realisation' ? 'text-green-600' : 'text-yellow-600'
                  }>
                    {p.type === 'pilotage' ? '🔵' : p.type === 'realisation' ? '🟢' : '🟡'}
                  </span>
                  <span className="text-gray-700">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Vous pourrez modifier chaque processus dans les étapes suivantes.
          </p>
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">
          ← Retour
        </button>
        <button
          onClick={() => onNext()}
          disabled={!generated || isSaving}
          className="rounded-lg px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {isSaving ? 'Sauvegarde…' : 'Continuer →'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Étape 5 : Commit**

```bash
git add src/components/cartographie/phase1/Step1Company.tsx src/components/cartographie/phase1/Step2AIGeneration.tsx src/index.css
git commit -m "feat(cartographie): Step1Company + Step2AIGeneration (IA + modèles secteur)"
```

---

## Task 5 : Step3Pilotage + Step4Realisation + ProcessFormRow

**Files:**
- Create: `src/components/cartographie/shared/ProcessFormRow.tsx`
- Create: `src/components/cartographie/phase1/Step3Pilotage.tsx`
- Create: `src/components/cartographie/phase1/Step4Realisation.tsx`

- [ ] **Étape 1 : Créer ProcessFormRow (composant réutilisable)**

```tsx
// src/components/cartographie/shared/ProcessFormRow.tsx
import type { ProcessDefinition } from '../../../types/cartographie';

interface Props {
  process: ProcessDefinition;
  onChange: (updated: ProcessDefinition) => void;
  onRemove: () => void;
  showInput?: boolean;   // réalisation: afficher entrée/sortie
  showRole?: boolean;    // pilotage: afficher rôle
  allProcesses?: ProcessDefinition[]; // pour le select "après quel processus"
}

export default function ProcessFormRow({ process, onChange, onRemove, showInput, showRole, allProcesses }: Props) {
  const field = (key: keyof ProcessDefinition, value: string) =>
    onChange({ ...process, [key]: value });

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-start gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold text-gray-600">Nom du processus *</label>
          <input
            type="text"
            value={process.name}
            onChange={(e) => field('name', e.target.value)}
            placeholder="Ex: Gestion des chantiers"
            className="input-field"
          />
        </div>
        <button
          onClick={onRemove}
          className="mt-5 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
          title="Supprimer ce processus"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Pilote (prénom + nom)</label>
          <input
            type="text"
            value={process.pilotName}
            onChange={(e) => field('pilotName', e.target.value)}
            placeholder="Ex: Jean Dupont"
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Poste / Fonction</label>
          <input
            type="text"
            value={process.pilotRole}
            onChange={(e) => field('pilotRole', e.target.value)}
            placeholder="Ex: Chef de chantier"
            className="input-field"
          />
        </div>
      </div>

      {showRole && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Rôle en une phrase
            <span className="ml-1 font-normal text-gray-400">(optionnel)</span>
          </label>
          <input
            type="text"
            value={process.role ?? ''}
            onChange={(e) => field('role', e.target.value)}
            placeholder="Ex: Définir la stratégie et les objectifs SSE de l'entreprise"
            className="input-field"
          />
        </div>
      )}

      {showInput && (
        <>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Ce processus reçoit… <span className="font-normal text-gray-400">(élément entrant)</span>
            </label>
            <input
              type="text"
              value={process.inputElement ?? ''}
              onChange={(e) => field('inputElement', e.target.value)}
              placeholder="Ex: Devis accepté signé par le client"
              className="input-field"
            />
            <p className="mt-1 text-xs text-gray-400">
              💡 C'est le document ou l'info qui "déclenche" ce processus
            </p>
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Ce processus produit… <span className="font-normal text-gray-400">(élément sortant)</span>
            </label>
            <input
              type="text"
              value={process.outputElement ?? ''}
              onChange={(e) => field('outputElement', e.target.value)}
              placeholder="Ex: Plan de prévention + planning chantier"
              className="input-field"
            />
          </div>
          {allProcesses && allProcesses.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Ce processus vient après…
              </label>
              <select
                value={process.afterProcessId ?? ''}
                onChange={(e) => onChange({ ...process, afterProcessId: e.target.value || undefined })}
                className="input-field"
              >
                <option value="">— Premier processus (pas de prédécesseur) —</option>
                {allProcesses.filter((p) => p.id !== process.id).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Étape 2 : Créer Step3Pilotage**

```tsx
// src/components/cartographie/phase1/Step3Pilotage.tsx
import type { StepProps } from './Phase1Wizard';
import type { ProcessDefinition } from '../../../types/cartographie';
import ProcessFormRow from '../shared/ProcessFormRow';

export default function Step3Pilotage({ state, update, onNext, onBack, isSaving }: StepProps) {
  const pilotage = state.processes.filter((p) => p.type === 'pilotage');

  const addProcess = () => {
    const newP: ProcessDefinition = {
      id: crypto.randomUUID(),
      type: 'pilotage',
      name: '',
      pilotName: '',
      pilotRole: '',
      role: '',
    };
    update({ processes: [...state.processes, newP] });
  };

  const updateProcess = (id: string, updated: ProcessDefinition) => {
    update({ processes: state.processes.map((p) => p.id === id ? updated : p) });
  };

  const removeProcess = (id: string) => {
    update({ processes: state.processes.filter((p) => p.id !== id) });
  };

  const canNext = pilotage.length >= 1 && pilotage.every((p) => p.name.trim());

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-xl font-bold text-gray-900">Processus de Pilotage</h2>
      <div className="mb-6 rounded-lg bg-blue-50 p-4" style={{ border: '1px solid #bfdbfe' }}>
        <p className="text-sm text-blue-900">
          <strong>🔵 C'est quoi le pilotage ?</strong><br />
          Ce sont les activités de décision stratégique — celles qui donnent le cap à toute l'entreprise.
          Exemple : la direction générale, la revue de direction, le pilotage SSE, l'amélioration continue.
          En général 2 à 4 processus de pilotage.
        </p>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        {pilotage.map((p) => (
          <ProcessFormRow
            key={p.id}
            process={p}
            onChange={(updated) => updateProcess(p.id, updated)}
            onRemove={() => removeProcess(p.id)}
            showRole
          />
        ))}
      </div>

      <button
        onClick={addProcess}
        className="mb-8 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 transition hover:border-blue-400 hover:text-blue-500"
      >
        + Ajouter un processus de pilotage
      </button>

      <div className="flex justify-between">
        <button onClick={onBack} className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">
          ← Retour
        </button>
        <button
          onClick={() => onNext()}
          disabled={!canNext || isSaving}
          className="rounded-lg px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {isSaving ? 'Sauvegarde…' : 'Étape suivante →'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Étape 3 : Créer Step4Realisation**

```tsx
// src/components/cartographie/phase1/Step4Realisation.tsx
import type { StepProps } from './Phase1Wizard';
import type { ProcessDefinition } from '../../../types/cartographie';
import ProcessFormRow from '../shared/ProcessFormRow';

export default function Step4Realisation({ state, update, onNext, onBack, isSaving }: StepProps) {
  const realisation = state.processes.filter((p) => p.type === 'realisation');

  const addProcess = () => {
    const newP: ProcessDefinition = {
      id: crypto.randomUUID(),
      type: 'realisation',
      name: '',
      pilotName: '',
      pilotRole: '',
      inputElement: '',
      outputElement: '',
    };
    update({ processes: [...state.processes, newP] });
  };

  const updateProcess = (id: string, updated: ProcessDefinition) => {
    update({ processes: state.processes.map((p) => p.id === id ? updated : p) });
  };

  const removeProcess = (id: string) => {
    update({ processes: state.processes.filter((p) => p.id !== id) });
  };

  const canNext = realisation.length >= 1 && realisation.every((p) =>
    p.name.trim() && p.inputElement?.trim() && p.outputElement?.trim()
  );

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-xl font-bold text-gray-900">Processus de Réalisation</h2>
      <div className="mb-6 rounded-lg bg-green-50 p-4" style={{ border: '1px solid #bbf7d0' }}>
        <p className="text-sm text-green-900">
          <strong>🟢 C'est quoi la réalisation ?</strong><br />
          Ce sont vos activités principales — celles pour lesquelles vos clients vous paient.
          Elles transforment une demande client en un résultat concret. Renseignez ce qui entre
          (document, info) et ce qui sort (livrable, résultat) pour chaque étape.
        </p>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        {realisation.map((p) => (
          <ProcessFormRow
            key={p.id}
            process={p}
            onChange={(updated) => updateProcess(p.id, updated)}
            onRemove={() => removeProcess(p.id)}
            showInput
            allProcesses={realisation}
          />
        ))}
      </div>

      <button
        onClick={addProcess}
        className="mb-8 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 transition hover:border-green-400 hover:text-green-600"
      >
        + Ajouter un processus de réalisation
      </button>

      <div className="flex justify-between">
        <button onClick={onBack} className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">
          ← Retour
        </button>
        <button
          onClick={() => onNext()}
          disabled={!canNext || isSaving}
          className="rounded-lg px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {isSaving ? 'Sauvegarde…' : 'Étape suivante →'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Étape 4 : Commit**

```bash
git add src/components/cartographie/shared/ProcessFormRow.tsx src/components/cartographie/phase1/Step3Pilotage.tsx src/components/cartographie/phase1/Step4Realisation.tsx
git commit -m "feat(cartographie): Step3Pilotage + Step4Realisation + ProcessFormRow"
```

---

## Task 6 : Step5Support + Step6Validation

**Files:**
- Create: `src/components/cartographie/phase1/Step5Support.tsx`
- Create: `src/components/cartographie/phase1/Step6Validation.tsx`

- [ ] **Étape 1 : Créer Step5Support**

```tsx
// src/components/cartographie/phase1/Step5Support.tsx
import type { StepProps } from './Phase1Wizard';
import type { ProcessDefinition } from '../../../types/cartographie';
import ProcessFormRow from '../shared/ProcessFormRow';

export default function Step5Support({ state, update, onNext, onBack, isSaving }: StepProps) {
  const support = state.processes.filter((p) => p.type === 'support');
  const realisation = state.processes.filter((p) => p.type === 'realisation');

  const addProcess = () => {
    const newP: ProcessDefinition = {
      id: crypto.randomUUID(),
      type: 'support',
      name: '',
      pilotName: '',
      pilotRole: '',
      linkedRealisationIds: [],
    };
    update({ processes: [...state.processes, newP] });
  };

  const updateProcess = (id: string, updated: ProcessDefinition) => {
    update({ processes: state.processes.map((p) => p.id === id ? updated : p) });
  };

  const removeProcess = (id: string) => {
    update({ processes: state.processes.filter((p) => p.id !== id) });
  };

  const toggleLink = (supportId: string, realisationId: string) => {
    const p = support.find((s) => s.id === supportId);
    if (!p) return;
    const links = p.linkedRealisationIds ?? [];
    const updated = links.includes(realisationId)
      ? links.filter((id) => id !== realisationId)
      : [...links, realisationId];
    updateProcess(supportId, { ...p, linkedRealisationIds: updated });
  };

  const canNext = support.length >= 1 && support.every((p) => p.name.trim());

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-xl font-bold text-gray-900">Processus Support</h2>
      <div className="mb-6 rounded-lg p-4" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
        <p className="text-sm text-yellow-900">
          <strong>🟡 C'est quoi le support ?</strong><br />
          Les processus support ne délivrent pas directement au client, mais ils fournissent tout ce
          dont vos équipes ont besoin pour travailler : les personnes, le matériel, les outils, la
          comptabilité… Cochez quels processus de réalisation chaque support alimente.
        </p>
      </div>

      <div className="flex flex-col gap-6 mb-6">
        {support.map((p) => (
          <div key={p.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <ProcessFormRow
              process={p}
              onChange={(updated) => updateProcess(p.id, updated)}
              onRemove={() => removeProcess(p.id)}
            />
            {realisation.length > 0 && (
              <div className="mt-3">
                <label className="mb-2 block text-xs font-semibold text-gray-600">
                  Ce support alimente ces processus de réalisation :
                </label>
                <div className="flex flex-wrap gap-2">
                  {realisation.map((r) => {
                    const linked = (p.linkedRealisationIds ?? []).includes(r.id);
                    return (
                      <button
                        key={r.id}
                        onClick={() => toggleLink(p.id, r.id)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          linked
                            ? 'bg-yellow-400 text-yellow-900'
                            : 'bg-white border border-gray-300 text-gray-500 hover:border-yellow-400'
                        }`}
                      >
                        {linked ? '✓ ' : ''}{r.name || 'Sans nom'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addProcess}
        className="mb-8 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 transition hover:border-yellow-400 hover:text-yellow-600"
      >
        + Ajouter un processus support
      </button>

      <div className="flex justify-between">
        <button onClick={onBack} className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">
          ← Retour
        </button>
        <button
          onClick={() => onNext()}
          disabled={!canNext || isSaving}
          className="rounded-lg px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {isSaving ? 'Sauvegarde…' : 'Vérifier la cohérence →'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Étape 2 : Créer Step6Validation**

```tsx
// src/components/cartographie/phase1/Step6Validation.tsx
import type { StepProps } from './Phase1Wizard';

interface Check {
  label: string;
  ok: boolean;
  message: string;
}

function runChecks(state: StepProps['state']): Check[] {
  const pilotage = state.processes.filter((p) => p.type === 'pilotage');
  const realisation = state.processes.filter((p) => p.type === 'realisation');
  const support = state.processes.filter((p) => p.type === 'support');

  return [
    {
      label: 'Processus de pilotage',
      ok: pilotage.length >= 1 && pilotage.every((p) => p.name.trim() && p.pilotName.trim()),
      message: pilotage.length === 0
        ? 'Aucun processus de pilotage — retournez à l\'étape 3'
        : pilotage.some((p) => !p.pilotName.trim())
        ? 'Certains processus de pilotage n\'ont pas de pilote renseigné'
        : `${pilotage.length} processus de pilotage complets ✓`,
    },
    {
      label: 'Éléments entrants et sortants',
      ok: realisation.every((p) => p.inputElement?.trim() && p.outputElement?.trim()),
      message: realisation.some((p) => !p.inputElement?.trim() || !p.outputElement?.trim())
        ? 'Certains processus de réalisation n\'ont pas d\'élément entrant ou sortant'
        : `Tous les flux de réalisation sont renseignés ✓`,
    },
    {
      label: 'Pilotes identifiés',
      ok: state.processes.every((p) => p.pilotName.trim()),
      message: state.processes.some((p) => !p.pilotName.trim())
        ? 'Certains processus n\'ont pas de pilote — renseignez-les pour être conforme MASE'
        : 'Tous les processus ont un pilote identifié ✓',
    },
    {
      label: 'Processus support liés',
      ok: support.every((p) => (p.linkedRealisationIds ?? []).length > 0),
      message: support.some((p) => (p.linkedRealisationIds ?? []).length === 0)
        ? 'Certains processus support ne sont liés à aucun processus de réalisation'
        : 'Tous les supports sont reliés à la réalisation ✓',
    },
  ];
}

export default function Step6Validation({ state, onNext, onBack, isSaving }: StepProps) {
  const checks = runChecks(state);
  const allOk = checks.every((c) => c.ok);
  const hasBlocker = !state.processes.some((p) => p.type === 'realisation');

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-xl font-bold text-gray-900">Vérification de la cohérence</h2>
      <p className="mb-6 text-sm text-gray-500">
        L'outil vérifie que votre cartographie est complète avant de générer l'aperçu.
      </p>

      <div className="flex flex-col gap-3 mb-8">
        {checks.map((check) => (
          <div
            key={check.label}
            className="flex gap-3 rounded-lg p-4"
            style={{
              backgroundColor: check.ok ? '#f0fdf4' : '#fffbeb',
              border: `1px solid ${check.ok ? '#bbf7d0' : '#fde68a'}`,
            }}
          >
            <span className="text-lg">{check.ok ? '✅' : '⚠️'}</span>
            <div>
              <div className={`text-sm font-semibold ${check.ok ? 'text-green-800' : 'text-yellow-800'}`}>
                {check.label}
              </div>
              <div className={`text-xs ${check.ok ? 'text-green-700' : 'text-yellow-700'}`}>
                {check.message}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!allOk && (
        <div className="mb-6 rounded-lg bg-blue-50 p-4" style={{ border: '1px solid #bfdbfe' }}>
          <p className="text-sm text-blue-800">
            💡 Les avertissements ci-dessus ne bloquent pas — vous pouvez continuer et corriger
            plus tard. Seule l'absence totale de processus de réalisation bloque le passage à l'aperçu.
          </p>
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={onBack} className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">
          ← Corriger
        </button>
        <button
          onClick={() => onNext()}
          disabled={hasBlocker || isSaving}
          className="rounded-lg px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {isSaving ? 'Sauvegarde…' : 'Voir l\'aperçu →'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Étape 3 : Commit**

```bash
git add src/components/cartographie/phase1/Step5Support.tsx src/components/cartographie/phase1/Step6Validation.tsx
git commit -m "feat(cartographie): Step5Support + Step6Validation (contrôles cohérence)"
```

---

## Task 7 : MapPreview — rendu visuel de la cartographie

**Files:**
- Create: `src/components/cartographie/shared/MapPreview.tsx`
- Create: `src/components/cartographie/shared/MapPreview.test.tsx`

C'est le composant clé du plan B — il rend la cartographie au format MASE standard (pilotage haut / réalisation milieu / support bas / client gauche-droite) en CSS pur.

- [ ] **Étape 1 : Écrire le test**

```tsx
// src/components/cartographie/shared/MapPreview.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MapPreview from './MapPreview';
import type { ProcessDefinition } from '../../../types/cartographie';

const PROCESSES: ProcessDefinition[] = [
  { id: 'p1', type: 'pilotage', name: 'Direction', pilotName: 'Jean', pilotRole: 'Dirigeant' },
  { id: 'p2', type: 'realisation', name: 'Chantiers', pilotName: 'Marie', pilotRole: 'Chef', inputElement: 'Devis', outputElement: 'PV' },
  { id: 'p3', type: 'support', name: 'RH', pilotName: 'Paul', pilotRole: 'DRH', linkedRealisationIds: ['p2'] },
];

describe('MapPreview', () => {
  it('affiche les 3 zones pilotage/réalisation/support', () => {
    render(<MapPreview processes={PROCESSES} companyName="Test SARL" />);
    expect(screen.getByText('PROCESSUS DE PILOTAGE')).toBeDefined();
    expect(screen.getByText('PROCESSUS DE RÉALISATION')).toBeDefined();
    expect(screen.getByText('PROCESSUS SUPPORT')).toBeDefined();
  });

  it('affiche les noms des processus', () => {
    render(<MapPreview processes={PROCESSES} companyName="Test SARL" />);
    expect(screen.getByText('Direction')).toBeDefined();
    expect(screen.getByText('Chantiers')).toBeDefined();
    expect(screen.getByText('RH')).toBeDefined();
  });

  it('affiche CLIENT à gauche et à droite', () => {
    render(<MapPreview processes={PROCESSES} companyName="Test SARL" />);
    const clientEls = screen.getAllByText('CLIENT');
    expect(clientEls.length).toBe(2);
  });

  it('affiche les éléments entrants/sortants', () => {
    render(<MapPreview processes={PROCESSES} companyName="Test SARL" />);
    expect(screen.getByText('Devis')).toBeDefined();
    expect(screen.getByText('PV')).toBeDefined();
  });
});
```

- [ ] **Étape 2 : Lancer le test — vérifier qu'il échoue**

```bash
npx vitest run src/components/cartographie/shared/MapPreview.test.tsx
```

- [ ] **Étape 3 : Créer MapPreview**

```tsx
// src/components/cartographie/shared/MapPreview.tsx
import type { ProcessDefinition } from '../../../types/cartographie';

interface Props {
  processes: ProcessDefinition[];
  companyName: string;
  compact?: boolean; // version réduite pour export
}

function sortRealisation(processes: ProcessDefinition[]): ProcessDefinition[][] {
  // Trier les processus de réalisation en groupes séquentiels/parallèles
  const realisation = processes.filter((p) => p.type === 'realisation');
  if (realisation.length === 0) return [];

  // Construire une séquence linéaire basée sur afterProcessId
  const ordered: ProcessDefinition[] = [];
  const remaining = [...realisation];

  // Premiers processus (sans prédécesseur)
  let current = remaining.filter((p) => !p.afterProcessId || !realisation.find((r) => r.id === p.afterProcessId));
  while (current.length > 0 && ordered.length < realisation.length) {
    current.forEach((p) => {
      if (!ordered.find((o) => o.id === p.id)) ordered.push(p);
    });
    const orderedIds = ordered.map((o) => o.id);
    current = remaining.filter((p) => !ordered.find((o) => o.id === p.id) && p.afterProcessId && orderedIds.includes(p.afterProcessId));
  }
  // Ajouter les non-placés
  remaining.forEach((p) => { if (!ordered.find((o) => o.id === p.id)) ordered.push(p); });

  // Grouper par parallélisme (parallelGroupId)
  const groups: ProcessDefinition[][] = [];
  ordered.forEach((p) => {
    if (p.parallelGroupId) {
      const existing = groups.find((g) => g[0]?.parallelGroupId === p.parallelGroupId);
      if (existing) { existing.push(p); return; }
    }
    groups.push([p]);
  });
  return groups;
}

function ProcessBox({ process, compact }: { process: ProcessDefinition; compact?: boolean }) {
  const color = process.type === 'pilotage' ? '#3b82f6' :
                process.type === 'realisation' ? '#16a34a' : '#ca8a04';
  const bg = process.type === 'pilotage' ? '#dbeafe' :
             process.type === 'realisation' ? '#dcfce7' : '#fef9c3';

  return (
    <div
      className="rounded text-center"
      style={{
        border: `1px solid ${color}`,
        backgroundColor: bg,
        padding: compact ? '4px 8px' : '8px 12px',
        minWidth: compact ? 80 : 100,
      }}
    >
      <div style={{ fontSize: compact ? 9 : 11, fontWeight: 700, color }}>{process.name}</div>
      {!compact && process.pilotName && (
        <div style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>{process.pilotName}</div>
      )}
    </div>
  );
}

function Arrow({ label, compact }: { label?: string; compact?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center" style={{ flexShrink: 0 }}>
      {label && !compact && (
        <span style={{ fontSize: 8, color: '#16a34a', whiteSpace: 'nowrap', maxWidth: 60, textAlign: 'center', lineHeight: 1.2, marginBottom: 1 }}>
          {label}
        </span>
      )}
      <span style={{ fontSize: compact ? 12 : 14, color: '#16a34a' }}>→</span>
    </div>
  );
}

export default function MapPreview({ processes, companyName, compact }: Props) {
  const pilotage = processes.filter((p) => p.type === 'pilotage');
  const realisationGroups = sortRealisation(processes);
  const support = processes.filter((p) => p.type === 'support');

  const borderStyle = '2px solid';

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', width: '100%' }}>
      {!compact && (
        <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
          Cartographie des Processus — {companyName}
        </div>
      )}

      {/* PILOTAGE */}
      <div
        className="flex flex-wrap items-center justify-center gap-2 rounded mb-2 p-3"
        style={{ border: `${borderStyle} #3b82f6`, backgroundColor: '#eff6ff' }}
      >
        <div style={{ fontSize: compact ? 8 : 10, fontWeight: 700, color: '#1e40af', marginRight: 8, whiteSpace: 'nowrap' }}>
          PROCESSUS DE PILOTAGE
        </div>
        {pilotage.length === 0
          ? <span style={{ fontSize: 9, color: '#94a3b8' }}>(aucun processus)</span>
          : pilotage.map((p) => <ProcessBox key={p.id} process={p} compact={compact} />)
        }
      </div>

      {/* Flèche pilotage vers réalisation */}
      <div style={{ textAlign: 'center', fontSize: 10, color: '#3b82f6', marginBottom: 4 }}>
        ↕ oriente et contrôle
      </div>

      {/* RÉALISATION ZONE avec CLIENT gauche/droite */}
      <div className="flex items-center gap-2 mb-2">
        {/* CLIENT gauche */}
        <div
          className="flex flex-shrink-0 flex-col items-center justify-center rounded text-center"
          style={{ border: `${borderStyle} #16a34a`, backgroundColor: '#f0fdf4', padding: compact ? '8px 4px' : '12px 8px', minWidth: compact ? 44 : 56 }}
        >
          <div style={{ fontSize: 16 }}>👤</div>
          <div style={{ fontSize: compact ? 8 : 10, fontWeight: 700, color: '#166534' }}>CLIENT</div>
          {!compact && <div style={{ fontSize: 8, color: '#166534' }}>Besoins</div>}
        </div>

        <Arrow label={realisationGroups[0]?.[0]?.inputElement} compact={compact} />

        {/* RÉALISATION */}
        <div
          className="flex-1 rounded p-3"
          style={{ border: `${borderStyle} #16a34a`, backgroundColor: '#f0fdf4' }}
        >
          <div style={{ fontSize: compact ? 8 : 10, fontWeight: 700, color: '#166534', marginBottom: 6, textAlign: 'center' }}>
            PROCESSUS DE RÉALISATION
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1">
            {realisationGroups.length === 0
              ? <span style={{ fontSize: 9, color: '#94a3b8' }}>(aucun processus)</span>
              : realisationGroups.map((group, gi) => (
                <div key={gi} className="flex items-center gap-1">
                  {gi > 0 && <Arrow label={realisationGroups[gi - 1]?.[0]?.outputElement} compact={compact} />}
                  {group.length === 1
                    ? <ProcessBox process={group[0]} compact={compact} />
                    : (
                      <div className="flex flex-col gap-1 items-center">
                        <div style={{ fontSize: 8, color: '#94a3b8' }}>// parallèle</div>
                        {group.map((p) => <ProcessBox key={p.id} process={p} compact={compact} />)}
                      </div>
                    )
                  }
                </div>
              ))
            }
          </div>
        </div>

        <Arrow label={realisationGroups[realisationGroups.length - 1]?.[0]?.outputElement} compact={compact} />

        {/* CLIENT droite */}
        <div
          className="flex flex-shrink-0 flex-col items-center justify-center rounded text-center"
          style={{ border: `${borderStyle} #16a34a`, backgroundColor: '#f0fdf4', padding: compact ? '8px 4px' : '12px 8px', minWidth: compact ? 44 : 56 }}
        >
          <div style={{ fontSize: 16 }}>😊</div>
          <div style={{ fontSize: compact ? 8 : 10, fontWeight: 700, color: '#166534' }}>CLIENT</div>
          {!compact && <div style={{ fontSize: 8, color: '#166534' }}>Satisfaction</div>}
        </div>
      </div>

      {/* Flèche support vers réalisation */}
      <div style={{ textAlign: 'center', fontSize: 10, color: '#ca8a04', marginBottom: 4 }}>
        ↕ fournit les ressources
      </div>

      {/* SUPPORT */}
      <div
        className="flex flex-wrap items-center justify-center gap-2 rounded p-3"
        style={{ border: `${borderStyle} #ca8a04`, backgroundColor: '#fffbeb' }}
      >
        <div style={{ fontSize: compact ? 8 : 10, fontWeight: 700, color: '#92400e', marginRight: 8, whiteSpace: 'nowrap' }}>
          PROCESSUS SUPPORT
        </div>
        {support.length === 0
          ? <span style={{ fontSize: 9, color: '#94a3b8' }}>(aucun processus)</span>
          : support.map((p) => <ProcessBox key={p.id} process={p} compact={compact} />)
        }
      </div>
    </div>
  );
}
```

- [ ] **Étape 4 : Lancer le test**

```bash
npx vitest run src/components/cartographie/shared/MapPreview.test.tsx
```

Résultat attendu : `4 passed`

- [ ] **Étape 5 : Commit**

```bash
git add src/components/cartographie/shared/MapPreview.tsx src/components/cartographie/shared/MapPreview.test.tsx
git commit -m "feat(cartographie): MapPreview visuel format MASE (pilotage/réalisation/support)"
```

---

## Task 8 : Step7Preview + Step8Export

**Files:**
- Create: `src/components/cartographie/phase1/Step7Preview.tsx`
- Create: `src/components/cartographie/phase1/Step8Export.tsx`

- [ ] **Étape 1 : Créer Step7Preview**

```tsx
// src/components/cartographie/phase1/Step7Preview.tsx
import type { StepProps } from './Phase1Wizard';
import MapPreview from '../shared/MapPreview';

export default function Step7Preview({ state, onNext, onBack, isSaving }: StepProps) {
  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-xl font-bold text-gray-900">Aperçu de votre cartographie</h2>
      <p className="mb-6 text-sm text-gray-500">
        Voici votre cartographie des processus. Vérifiez que tout est correct avant de générer le PDF.
        Vous pouvez revenir en arrière pour modifier.
      </p>

      <div
        className="mb-6 rounded-xl p-4"
        style={{ border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}
      >
        <MapPreview
          processes={state.processes}
          companyName={state.companyName}
        />
      </div>

      <div className="mb-6 rounded-lg bg-blue-50 p-4" style={{ border: '1px solid #bfdbfe' }}>
        <p className="text-sm text-blue-800">
          💡 <strong>Vous pourrez modifier les noms des pilotes et les détails dans la Phase 2.</strong><br />
          Ici, vérifiez surtout l'enchaînement des processus de réalisation et les flux entre eux.
        </p>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">
          ← Modifier
        </button>
        <button
          onClick={() => onNext()}
          disabled={isSaving}
          className="rounded-lg px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {isSaving ? 'Sauvegarde…' : 'Générer le PDF →'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Étape 2 : Créer Step8Export**

```tsx
// src/components/cartographie/phase1/Step8Export.tsx
import { useState } from 'react';
import type { StepProps } from './Phase1Wizard';
import { generateAndDownloadCartographyPdf } from '../../../engine/cartographie/renderCartographyPdf';

export default function Step8Export({ state, onBack }: StepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await generateAndDownloadCartographyPdf({
        processes: state.processes,
        companyName: state.companyName,
        sector: state.sector,
        headcount: state.headcount,
        sseManagerName: state.sseManagerName,
        sseManagerRole: state.sseManagerRole,
        documentDate: state.documentDate,
      });
      setDownloaded(true);
    } catch (e) {
      console.error('Erreur génération PDF:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm text-center">
      <div className="mb-4 text-5xl">🎉</div>
      <h2 className="mb-3 text-2xl font-bold text-gray-900">Phase 1 terminée !</h2>
      <p className="mb-8 text-gray-500">
        Votre cartographie des processus est prête. Téléchargez-la au format PDF,
        puis passez à la Phase 2 pour détailler chaque processus.
      </p>

      <div className="mb-8 flex flex-col gap-3">
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="flex items-center justify-center gap-3 rounded-xl py-4 text-base font-bold text-white disabled:opacity-60"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {isGenerating ? (
            <><span className="animate-spin">⏳</span> Génération du PDF…</>
          ) : (
            <><span>📄</span> Télécharger la cartographie PDF</>
          )}
        </button>

        {downloaded && (
          <div className="rounded-lg bg-green-50 py-3 text-sm font-semibold text-green-700">
            ✓ PDF téléchargé !
          </div>
        )}
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
        <div className="mb-3 text-lg font-bold text-green-800">Et maintenant ?</div>
        <p className="mb-4 text-sm text-green-700">
          La <strong>Phase 2</strong> vous permet de détailler chaque processus : pilote confirmé,
          objectif SMART, KPIs, risques, documents associés. Elle produit les <strong>fiches de processus</strong>
          qui complètent votre dossier MASE.
        </p>
        <a
          href="/cartographie/wizard"
          className="inline-block rounded-lg px-6 py-3 text-sm font-bold text-white"
          style={{ backgroundColor: '#16a34a' }}
        >
          Démarrer la Phase 2 →
        </a>
      </div>

      <button
        onClick={onBack}
        className="mt-6 text-sm text-gray-400 underline hover:text-gray-600"
      >
        ← Revenir à l'aperçu
      </button>
    </div>
  );
}
```

- [ ] **Étape 3 : Commit**

```bash
git add src/components/cartographie/phase1/Step7Preview.tsx src/components/cartographie/phase1/Step8Export.tsx
git commit -m "feat(cartographie): Step7Preview + Step8Export"
```

---

## Task 9 : renderCartographyPdf — génération PDF

**Files:**
- Create: `src/engine/cartographie/renderCartographyPdf.tsx`

- [ ] **Étape 1 : Créer le moteur PDF**

```tsx
// src/engine/cartographie/renderCartographyPdf.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { ProcessDefinition } from '../../types/cartographie';

interface CartographyPdfProps {
  processes: ProcessDefinition[];
  companyName: string;
  sector: string;
  headcount: number;
  sseManagerName: string;
  sseManagerRole: string;
  documentDate: string;
}

const S = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica' },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 11, textAlign: 'center', color: '#374151', marginBottom: 16 },
  meta: { fontSize: 9, color: '#6b7280', textAlign: 'center', marginBottom: 20 },

  // Zones
  zone: { borderRadius: 4, padding: 8, marginBottom: 6 },
  zoneTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', letterSpacing: 1, marginBottom: 6, textAlign: 'center' },

  pilotageZone: { backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#3b82f6', borderStyle: 'solid' },
  pilotageTitle: { color: '#1e40af' },

  realisationZone: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#16a34a', borderStyle: 'solid' },
  realisationTitle: { color: '#166534' },

  supportZone: { backgroundColor: '#fef9c3', borderWidth: 1, borderColor: '#ca8a04', borderStyle: 'solid' },
  supportTitle: { color: '#92400e' },

  // Boîtes processus
  processRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  processBox: { borderRadius: 3, padding: 5, alignItems: 'center', minWidth: 80, maxWidth: 120 },
  processName: { fontSize: 8, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  pilotLabel: { fontSize: 7, color: '#6b7280', textAlign: 'center', marginTop: 2 },

  pilotageBox: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#93c5fd', borderStyle: 'solid' },
  realisationBox: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderStyle: 'solid' },
  supportBox: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderStyle: 'solid' },

  // Ligne réalisation avec clients
  realisationRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  clientBox: { width: 44, padding: 5, borderRadius: 3, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#16a34a', borderStyle: 'solid', alignItems: 'center' },
  clientText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#166534', textAlign: 'center' },
  clientSub: { fontSize: 6, color: '#166534', textAlign: 'center' },
  arrow: { fontSize: 10, color: '#16a34a', marginHorizontal: 4 },
  flowLabel: { fontSize: 6, color: '#16a34a', textAlign: 'center', maxWidth: 50 },
  arrowCol: { alignItems: 'center', justifyContent: 'center', marginHorizontal: 2 },

  realisationInner: { flex: 1, borderRadius: 4, padding: 6, backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#16a34a', borderStyle: 'solid' },

  dividerText: { fontSize: 8, color: '#6b7280', textAlign: 'center', marginVertical: 3 },

  footer: { marginTop: 20, fontSize: 8, color: '#9ca3af', textAlign: 'center' },
});

function ProcessBox({ process, style, textStyle }: {
  process: ProcessDefinition;
  style: object;
  textStyle: object;
}) {
  return (
    <View style={[S.processBox, style]}>
      <Text style={[S.processName, textStyle]}>{process.name}</Text>
      {process.pilotName && process.pilotName !== '(à compléter)' && (
        <Text style={S.pilotLabel}>{process.pilotName}</Text>
      )}
    </View>
  );
}

function sortRealisation(processes: ProcessDefinition[]): ProcessDefinition[] {
  const realisation = processes.filter((p) => p.type === 'realisation');
  const ordered: ProcessDefinition[] = [];
  const remaining = [...realisation];
  let current = remaining.filter((p) => !p.afterProcessId || !realisation.find((r) => r.id === p.afterProcessId));
  while (current.length > 0 && ordered.length < realisation.length) {
    current.forEach((p) => { if (!ordered.find((o) => o.id === p.id)) ordered.push(p); });
    const orderedIds = ordered.map((o) => o.id);
    current = remaining.filter((p) => !ordered.find((o) => o.id === p.id) && p.afterProcessId && orderedIds.includes(p.afterProcessId));
  }
  remaining.forEach((p) => { if (!ordered.find((o) => o.id === p.id)) ordered.push(p); });
  return ordered;
}

function CartographyDocument({ processes, companyName, sector, sseManagerName, sseManagerRole, documentDate }: CartographyPdfProps) {
  const pilotage = processes.filter((p) => p.type === 'pilotage');
  const realisationOrdered = sortRealisation(processes);
  const support = processes.filter((p) => p.type === 'support');

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={S.page}>
        <Text style={S.title}>CARTOGRAPHIE DES PROCESSUS</Text>
        <Text style={S.subtitle}>{companyName} — {sector}</Text>
        <Text style={S.meta}>
          Responsable SSE/Qualité : {sseManagerName} ({sseManagerRole}) · Document du {documentDate}
        </Text>

        {/* PILOTAGE */}
        <View style={[S.zone, S.pilotageZone]}>
          <Text style={[S.zoneTitle, S.pilotageTitle]}>PROCESSUS DE PILOTAGE</Text>
          <View style={S.processRow}>
            {pilotage.map((p) => (
              <ProcessBox key={p.id} process={p} style={S.pilotageBox} textStyle={{ color: '#1e40af' }} />
            ))}
          </View>
        </View>

        <Text style={S.dividerText}>↕ oriente et contrôle</Text>

        {/* RÉALISATION avec CLIENT gauche/droite */}
        <View style={S.realisationRow}>
          {/* CLIENT gauche */}
          <View style={S.clientBox}>
            <Text style={S.clientText}>CLIENT</Text>
            <Text style={S.clientSub}>Besoins</Text>
          </View>

          {realisationOrdered.length > 0 && (
            <View style={S.arrowCol}>
              <Text style={S.flowLabel}>{realisationOrdered[0].inputElement ?? ''}</Text>
              <Text style={S.arrow}>→</Text>
            </View>
          )}

          {/* RÉALISATION */}
          <View style={[S.realisationInner]}>
            <Text style={[S.zoneTitle, S.realisationTitle]}>PROCESSUS DE RÉALISATION</Text>
            <View style={[S.processRow]}>
              {realisationOrdered.map((p, i) => (
                <React.Fragment key={p.id}>
                  {i > 0 && (
                    <View style={S.arrowCol}>
                      <Text style={S.flowLabel}>{realisationOrdered[i - 1].outputElement ?? ''}</Text>
                      <Text style={S.arrow}>→</Text>
                    </View>
                  )}
                  <ProcessBox process={p} style={S.realisationBox} textStyle={{ color: '#166534' }} />
                </React.Fragment>
              ))}
            </View>
          </View>

          {realisationOrdered.length > 0 && (
            <View style={S.arrowCol}>
              <Text style={S.flowLabel}>{realisationOrdered[realisationOrdered.length - 1].outputElement ?? ''}</Text>
              <Text style={S.arrow}>→</Text>
            </View>
          )}

          {/* CLIENT droite */}
          <View style={S.clientBox}>
            <Text style={S.clientText}>CLIENT</Text>
            <Text style={S.clientSub}>Satisfaction</Text>
          </View>
        </View>

        <Text style={S.dividerText}>↕ fournit les ressources</Text>

        {/* SUPPORT */}
        <View style={[S.zone, S.supportZone]}>
          <Text style={[S.zoneTitle, S.supportTitle]}>PROCESSUS SUPPORT</Text>
          <View style={S.processRow}>
            {support.map((p) => (
              <ProcessBox key={p.id} process={p} style={S.supportBox} textStyle={{ color: '#92400e' }} />
            ))}
          </View>
        </View>

        <Text style={S.footer}>
          Cartographie générée par site-internet-mase.vercel.app · Conforme référentiel MASE V2024
        </Text>
      </Page>
    </Document>
  );
}

export async function generateAndDownloadCartographyPdf(props: CartographyPdfProps): Promise<void> {
  const doc = <CartographyDocument {...props} />;
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cartographie-${props.companyName.toLowerCase().replace(/\s+/g, '-')}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Étape 2 : Vérifier la compilation TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

Résultat attendu : pas d'erreur sur les nouveaux fichiers.

- [ ] **Étape 3 : Commit**

```bash
git add src/engine/cartographie/renderCartographyPdf.tsx
git commit -m "feat(cartographie): renderCartographyPdf PDF A4 paysage format MASE"
```

---

## Task 10 : Vérification build et push

- [ ] **Étape 1 : Lancer tous les tests**

```bash
npx vitest run src/types/cartographie.test.ts src/hooks/useCartographie.test.ts src/components/cartographie/shared/MapPreview.test.tsx src/pages/CartographieWizardPage.test.tsx
```

Résultat attendu : tous passent (16+ tests)

- [ ] **Étape 2 : Build de production**

```bash
npx vite build 2>&1 | tail -5
```

Résultat attendu : `✓ built in X.Xs` sans erreur.

- [ ] **Étape 3 : Push**

```bash
git push origin main
```

---

## Self-Review

**Couverture spec Phase 1 :**

| Exigence | Tâche |
|---|---|
| Écran introduction pédagogique (concepts + exemple) | Task 2 |
| Route `/cartographie/wizard` avec guard accès | Task 1 |
| Barre de progression 8 étapes | Task 1 |
| Étape 1 : infos entreprise (5 champs) | Task 4 |
| Étape 2 : génération IA + modèle secteur fallback | Task 4 |
| Étape 3 : processus pilotage | Task 5 |
| Étape 4 : processus réalisation (flux + séquentiel) | Task 5 |
| Étape 5 : processus support + liens réalisation | Task 6 |
| Étape 6 : validation cohérence automatique | Task 6 |
| Étape 7 : aperçu visuel interactif format MASE | Task 7 + Task 8 |
| Étape 8 : export PDF cartographie | Task 8 + Task 9 |
| Auto-save Supabase après chaque étape | Task 3 |
| Reprise possible (reload) | Task 3 |

**Hors périmètre Plan B (Plan C) :**
- Phase 2 fiches de processus
- Objectifs SMART
- PDF fiches + bundle
