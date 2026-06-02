# Auth Google, Stripe & Sauvegarde — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sécuriser l'accès à l'outil Politique SSE derrière un paiement unique Stripe 29 €, vérifier le flow OAuth Google, et permettre à un utilisateur connecté/payant de reprendre son questionnaire.

**Architecture:** Stripe Checkout hébergé (redirect) avec deux Edge Functions Supabase : `create-checkout-session` (génère l'URL Stripe côté serveur) et `stripe-webhook` (reçoit la confirmation de paiement, écrit dans Supabase). Le frontend lit la table `purchases` via le hook `useAccess` pour décider d'afficher ou non l'overlay `AccessGate`.

**Tech Stack:** React 19, TypeScript, Supabase (tables SQL + Edge Functions Deno), Stripe Checkout (mode payment), Vitest (tests existants non modifiés).

**Spec:** `docs/superpowers/specs/2026-06-02-auth-stripe-save-design.md`

**Projet Supabase:** `ulceeurwibmbtnqhkaao`

---

## Carte des fichiers

| Statut | Fichier | Rôle |
| --- | --- | --- |
| Créer | `supabase/functions/_shared/cors.ts` | Headers CORS partagés |
| Créer | `supabase/functions/create-checkout-session/index.ts` | Edge Function : génère l'URL Stripe Checkout |
| Créer | `supabase/functions/stripe-webhook/index.ts` | Edge Function : confirme le paiement → insère dans `purchases` |
| Créer | `src/lib/stripe.ts` | Appelle `create-checkout-session` et redirige |
| Créer | `src/hooks/useAccess.ts` | Hook : lit `purchases` + `questionnaire_progress` |
| Créer | `src/components/AccessGate.tsx` | Overlay de blocage (connexion / paiement) |
| Modifier | `src/App.tsx` | Intègre `useAccess`, gating, retour Stripe, save answers |
| Modifier | `src/components/Welcome.tsx` | Ajoute le bouton "Reprendre mon diagnostic" |
| Modifier | `src/components/Questionnaire.tsx` | Ajoute le callback `onSaveAnswers` |

---

## Task 0 : Vérification de la configuration OAuth Google

**Files:**
- Aucun fichier à modifier — vérification de configuration uniquement.

- [ ] **Étape 1 : Vérifier Supabase dashboard**

  Ouvrir `https://supabase.com/dashboard/project/ulceeurwibmbtnqhkaao/auth/providers`.
  Vérifier que **Google** est activé et que les champs suivants sont renseignés :
  - Client ID : `1037568784112-raam9069vasq84ds9a1r8skqndhfeljn.apps.googleusercontent.com`
  - Client Secret : (la valeur du projet GCP DEF-OI-FREE)

- [ ] **Étape 2 : Vérifier Google Cloud Console**

  Ouvrir `https://console.cloud.google.com/apis/credentials` → sélectionner le client OAuth DEF-OI-FREE.
  Dans **Authorized redirect URIs**, confirmer la présence de :
  ```
  https://ulceeurwibmbtnqhkaao.supabase.co/auth/v1/callback
  ```
  Si absent, l'ajouter et sauvegarder.

- [ ] **Étape 3 : Tester le flow OAuth manuellement**

  Démarrer l'app (`npm run dev`), cliquer "Se connecter avec Google", compléter le flow.
  Résultat attendu : retour sur `http://localhost:5173`, session active, avatar affiché dans le header.

- [ ] **Étape 4 : Commit si un URI manquait**

  Si aucune modification de config : aucun commit nécessaire. Passer à Task 1.

---

## Task 1 : Migration SQL — tables Supabase

**Files:**
- Créer : `supabase/migrations/20260602000001_purchases.sql`
- Créer : `supabase/migrations/20260602000002_questionnaire_progress.sql`

- [ ] **Étape 1 : Créer le dossier migrations**

  ```bash
  mkdir -p supabase/migrations
  ```

- [ ] **Étape 2 : Écrire la migration purchases**

  Fichier `supabase/migrations/20260602000001_purchases.sql` :

  ```sql
  create table if not exists purchases (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid references auth.users not null,
    stripe_session_id text unique not null,
    amount_cents      int not null,
    created_at        timestamptz default now()
  );

  alter table purchases enable row level security;

  create policy "Lecture par propriétaire"
    on purchases for select
    using (auth.uid() = user_id);
  ```

- [ ] **Étape 3 : Écrire la migration questionnaire_progress**

  Fichier `supabase/migrations/20260602000002_questionnaire_progress.sql` :

  ```sql
  create table if not exists questionnaire_progress (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid references auth.users unique not null,
    answers    jsonb not null,
    updated_at timestamptz default now()
  );

  alter table questionnaire_progress enable row level security;

  create policy "CRUD par propriétaire"
    on questionnaire_progress for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  ```

- [ ] **Étape 4 : Appliquer les migrations via l'outil Supabase MCP**

  Utiliser `mcp__claude_ai_Supabase__apply_migration` avec le projet `ulceeurwibmbtnqhkaao` pour les deux fichiers SQL ci-dessus, dans l'ordre.

  Vérifier via `mcp__claude_ai_Supabase__list_tables` que les tables `purchases` et `questionnaire_progress` apparaissent.

- [ ] **Étape 5 : Commit**

  ```bash
  git add supabase/migrations/
  git commit -m "feat: migrations SQL purchases et questionnaire_progress"
  ```

---

## Task 2 : Edge Function `create-checkout-session`

**Files:**
- Créer : `supabase/functions/_shared/cors.ts`
- Créer : `supabase/functions/create-checkout-session/index.ts`

- [ ] **Étape 1 : Créer le fichier CORS partagé**

  Fichier `supabase/functions/_shared/cors.ts` :

  ```typescript
  export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  ```

- [ ] **Étape 2 : Écrire la Edge Function**

  Fichier `supabase/functions/create-checkout-session/index.ts` :

  ```typescript
  import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
  import { corsHeaders } from '../_shared/cors.ts';

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  });

  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const { user_id, email } = await req.json() as { user_id: string; email: string };
      const appUrl = Deno.env.get('APP_URL')!;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: { name: 'Générateur Politique SSE — MASE' },
            unit_amount: 2900,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${appUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/`,
        customer_email: email,
        metadata: { user_id },
      });

      return new Response(
        JSON.stringify({ url: session.url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  });
  ```

- [ ] **Étape 3 : Commit**

  ```bash
  git add supabase/functions/
  git commit -m "feat: Edge Function create-checkout-session"
  ```

---

## Task 3 : Edge Function `stripe-webhook`

**Files:**
- Créer : `supabase/functions/stripe-webhook/index.ts`

- [ ] **Étape 1 : Écrire la Edge Function**

  Fichier `supabase/functions/stripe-webhook/index.ts` :

  ```typescript
  import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  });

  Deno.serve(async (req) => {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400 });
    }

    const body = await req.text();

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
        undefined,
        Stripe.createSubtleCryptoProvider(),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signature invalide';
      return new Response(`Webhook Error: ${message}`, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;

      if (!userId) {
        console.error('user_id manquant dans les metadata Stripe');
        return new Response('user_id manquant', { status: 400 });
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      const { error } = await supabase.from('purchases').insert({
        user_id: userId,
        stripe_session_id: session.id,
        amount_cents: session.amount_total ?? 2900,
      });

      if (error) {
        console.error('Erreur DB:', error.message);
        return new Response('Erreur base de données', { status: 500 });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
  ```

- [ ] **Étape 2 : Commit**

  ```bash
  git add supabase/functions/stripe-webhook/
  git commit -m "feat: Edge Function stripe-webhook"
  ```

---

## Task 4 : Configurer les secrets des Edge Functions

**Files:**
- Aucun fichier de code — configuration Supabase dashboard.

- [ ] **Étape 1 : Récupérer les clés Stripe**

  Ouvrir `https://dashboard.stripe.com/apikeys`.
  - Copier la **clé secrète** (commence par `sk_test_` en mode test, `sk_live_` en prod).
  - Copier la **clé publiable** (commence par `pk_` — pour référence future).

- [ ] **Étape 2 : Configurer les secrets Supabase via MCP ou dashboard**

  Via le dashboard Supabase → Edge Functions → Secrets (`https://supabase.com/dashboard/project/ulceeurwibmbtnqhkaao/functions/secrets`) :

  | Clé | Valeur |
  | --- | --- |
  | `STRIPE_SECRET_KEY` | `sk_test_...` (ou `sk_live_...`) |
  | `APP_URL` | `http://localhost:5173` (dev) ou URL de production |
  | `STRIPE_WEBHOOK_SECRET` | À renseigner après Task 12 (créer le webhook en premier) |
  | `SUPABASE_URL` | `https://ulceeurwibmbtnqhkaao.supabase.co` |
  | `SUPABASE_SERVICE_ROLE_KEY` | Clé service role du projet Supabase |

  Note : `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont souvent déjà injectés automatiquement dans les Edge Functions Supabase. Vérifier si c'est le cas dans les logs après déploiement.

- [ ] **Étape 3 : Ajouter VITE_STRIPE_PUBLISHABLE_KEY dans .env.local**

  Dans `.env.local` (non commité), ajouter :
  ```
  VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
  ```
  Ce n'est pas utilisé dans ce build (pas de Stripe.js côté client), mais utile pour la référence future.

---

## Task 5 : `src/lib/stripe.ts`

**Files:**
- Créer : `src/lib/stripe.ts`

- [ ] **Étape 1 : Écrire la fonction redirectToCheckout**

  Fichier `src/lib/stripe.ts` :

  ```typescript
  import { supabase } from './supabase';

  export async function redirectToCheckout(userId: string, email: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { user_id: userId, email },
    });

    if (error || !data?.url) {
      throw new Error(error?.message ?? 'Impossible de créer la session de paiement');
    }

    window.location.href = data.url as string;
  }
  ```

- [ ] **Étape 2 : Commit**

  ```bash
  git add src/lib/stripe.ts
  git commit -m "feat: lib stripe - redirectToCheckout"
  ```

---

## Task 6 : `src/hooks/useAccess.ts`

**Files:**
- Créer : `src/hooks/useAccess.ts`

- [ ] **Étape 1 : Écrire le hook**

  Fichier `src/hooks/useAccess.ts` :

  ```typescript
  import { useState, useEffect, useCallback } from 'react';
  import type { Session } from '@supabase/supabase-js';
  import { supabase } from '../lib/supabase';

  export interface AccessState {
    hasPurchase: boolean;
    isLoading: boolean;
    savedAnswers: Record<string, string> | null;
  }

  export function useAccess(session: Session | null): AccessState & { refetch: () => void } {
    const [state, setState] = useState<AccessState>({
      hasPurchase: false,
      isLoading: false,
      savedAnswers: null,
    });

    const fetch = useCallback(async () => {
      if (!session) {
        setState({ hasPurchase: false, isLoading: false, savedAnswers: null });
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true }));

      const [purchaseResult, progressResult] = await Promise.all([
        supabase
          .from('purchases')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle(),
        supabase
          .from('questionnaire_progress')
          .select('answers')
          .eq('user_id', session.user.id)
          .maybeSingle(),
      ]);

      setState({
        hasPurchase: !!purchaseResult.data,
        isLoading: false,
        savedAnswers: (progressResult.data?.answers as Record<string, string>) ?? null,
      });
    }, [session]);

    useEffect(() => {
      fetch();
    }, [fetch]);

    return { ...state, refetch: fetch };
  }
  ```

- [ ] **Étape 2 : Commit**

  ```bash
  git add src/hooks/useAccess.ts
  git commit -m "feat: hook useAccess - lecture purchases et questionnaire_progress"
  ```

---

## Task 7 : `src/components/AccessGate.tsx`

**Files:**
- Créer : `src/components/AccessGate.tsx`

- [ ] **Étape 1 : Écrire le composant**

  Fichier `src/components/AccessGate.tsx` :

  ```typescript
  import { useState } from 'react';
  import type { Session } from '@supabase/supabase-js';
  import { supabase } from '../lib/supabase';
  import { redirectToCheckout } from '../lib/stripe';

  interface Props {
    session: Session | null;
    onClose: () => void;
  }

  export function AccessGate({ session, onClose }: Props) {
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignIn = async () => {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
    };

    const handlePurchase = async () => {
      if (!session) return;
      setIsRedirecting(true);
      setError(null);
      try {
        await redirectToCheckout(session.user.id, session.user.email ?? '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setIsRedirecting(false);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
          {!session ? (
            <>
              <h2 className="text-xl font-bold text-[var(--mase-heading)]">
                Connexion requise
              </h2>
              <p className="mt-2 text-sm text-[var(--mase-muted)]">
                Connectez-vous pour accéder au générateur de Politique SSE.
              </p>
              <button
                type="button"
                onClick={handleSignIn}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Se connecter avec Google
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full rounded-full border border-[var(--mase-border)] px-6 py-2 text-sm text-[var(--mase-muted)] transition hover:bg-gray-50"
              >
                Annuler
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-[var(--mase-heading)]">
                Accès à l'outil
              </h2>
              <p className="mt-2 text-sm text-[var(--mase-muted)]">
                Le générateur de Politique SSE MASE est disponible avec un accès unique.
              </p>
              <div className="mt-4 rounded-2xl bg-[var(--mase-card-strong)] p-4">
                <p className="text-lg font-bold text-[var(--mase-primary)]">29 € — accès à vie</p>
                <p className="mt-1 text-xs text-[var(--mase-muted)]">
                  Paiement unique, sans abonnement. Document DOCX téléchargeable immédiatement.
                </p>
              </div>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              <button
                type="button"
                onClick={handlePurchase}
                disabled={isRedirecting}
                className="mt-6 w-full rounded-full bg-[var(--mase-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--mase-primary-dark)] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isRedirecting ? 'Redirection vers le paiement…' : 'Accéder pour 29 €'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full rounded-full border border-[var(--mase-border)] px-6 py-2 text-sm text-[var(--mase-muted)] transition hover:bg-gray-50"
              >
                Annuler
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
  ```

- [ ] **Étape 2 : Commit**

  ```bash
  git add src/components/AccessGate.tsx
  git commit -m "feat: composant AccessGate"
  ```

---

## Task 8 : Modifier `src/App.tsx`

**Files:**
- Modifier : `src/App.tsx`

**Contexte :** `App.tsx` existant orchestre les étapes (welcome → questionnaire → company → preview) et gère la session Supabase. On y ajoute : `useAccess`, le gating, le polling retour Stripe, la sauvegarde des réponses.

- [ ] **Étape 1 : Remplacer `src/App.tsx` par la version complète**

  ```typescript
  import { useState, useEffect, useCallback } from 'react';
  import type { Session } from '@supabase/supabase-js';
  import { supabase } from './lib/supabase';
  import { useAccess } from './hooks/useAccess';
  import { AuthButton } from './components/AuthButton';
  import { AccessGate } from './components/AccessGate';
  import Welcome from './components/Welcome';
  import { Questionnaire } from './components/Questionnaire';
  import { CompanyInfoForm } from './components/CompanyInfo';
  import { PolicyPreview } from './components/PolicyPreview';
  import { QUESTIONS } from './engine/questionnaire';
  import { computeIndicators } from './engine/indicators';
  import { selectBlocks } from './engine/selectBlocks';
  import { downloadPolicyDocx } from './engine/renderDocx';
  import { enhanceWithMistral } from './engine/enhanceWithMistral';
  import type { CompanyInfo, Indicators, SelectedBlock } from './engine/types';

  export type Step = 'welcome' | 'questionnaire' | 'company' | 'preview';

  const STEPS: { id: Step; label: string }[] = [
    { id: 'welcome',       label: 'Accueil' },
    { id: 'questionnaire', label: 'Questionnaire' },
    { id: 'company',       label: 'Infos entreprise' },
    { id: 'preview',       label: 'Politique SSE' },
  ];

  export default function App() {
    const [step, setStep]       = useState<Step>('welcome');
    const [session, setSession] = useState<Session | null>(null);
    const [showGate, setShowGate] = useState(false);
    const [answers, setAnswersState] = useState<Record<string, string>>({});
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
      name: '', sector: '', headcount: '', activities: '', employerName: '',
    });
    const [indicators,     setIndicators]     = useState<Indicators | null>(null);
    const [selectedBlocks, setSelectedBlocks] = useState<SelectedBlock[]>([]);
    const [isEnhanced,   setIsEnhanced]   = useState(false);
    const [isEnhancing,  setIsEnhancing]  = useState(false);
    const [enhanceError, setEnhanceError] = useState<string | null>(null);
    const [paymentPending, setPaymentPending] = useState(false);

    // Gestion session auth
    useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
      return () => subscription.unsubscribe();
    }, []);

    const { hasPurchase, isLoading: accessLoading, savedAnswers, refetch } = useAccess(session);

    // Détection retour Stripe (?payment=success) — polling jusqu'à confirmation
    useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('payment') !== 'success') return;
      window.history.replaceState({}, '', '/');
      setPaymentPending(true);

      let count = 0;
      const interval = setInterval(() => {
        count++;
        refetch();
        if (count >= 5) clearInterval(interval);
      }, 2000);

      return () => clearInterval(interval);
    // refetch est stable (useCallback), pas de boucle infinie
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Quand l'achat est confirmé après le retour Stripe
    useEffect(() => {
      if (paymentPending && hasPurchase) {
        setPaymentPending(false);
        setShowGate(false);
      }
    }, [paymentPending, hasPurchase]);

    // Fermer la gate automatiquement si l'achat est confirmé (ex: OAuth puis vérification)
    useEffect(() => {
      if (hasPurchase && showGate) {
        setShowGate(false);
      }
    }, [hasPurchase, showGate]);

    const setAnswer = (questionId: string, choiceValue: string) =>
      setAnswersState((prev) => ({ ...prev, [questionId]: choiceValue }));

    // Sauvegarde best-effort des réponses en fin de questionnaire
    const handleSaveAnswers = useCallback(async (answersToSave: Record<string, string>) => {
      if (!session) return;
      await supabase.from('questionnaire_progress').upsert(
        { user_id: session.user.id, answers: answersToSave, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
    }, [session]);

    const handleStart = () => {
      if (hasPurchase) {
        setStep('questionnaire');
      } else {
        setShowGate(true);
      }
    };

    const handleResume = () => {
      if (savedAnswers) {
        setAnswersState(savedAnswers);
        setStep('company');
      }
    };

    const goToPreview = () => {
      const ind = computeIndicators(answers);
      setIndicators(ind);
      setSelectedBlocks(selectBlocks(ind));
      setIsEnhanced(false);
      setEnhanceError(null);
      setStep('preview');
    };

    const handleEnhance = async () => {
      if (!indicators) return;
      setIsEnhancing(true);
      setEnhanceError(null);
      try {
        setSelectedBlocks(await enhanceWithMistral(selectedBlocks, companyInfo, indicators));
        setIsEnhanced(true);
      } catch (err) {
        setEnhanceError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setIsEnhancing(false);
      }
    };

    const handleRestart = () => {
      setAnswersState({});
      setCompanyInfo({ name: '', sector: '', headcount: '', activities: '', employerName: '' });
      setSelectedBlocks([]);
      setIsEnhanced(false);
      setEnhanceError(null);
      setStep('welcome');
    };

    const stepIndex     = STEPS.findIndex((s) => s.id === step);
    const answeredCount = Object.keys(answers).length;
    const progressPct   = (stepIndex / (STEPS.length - 1)) * 100;

    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#f5f5f3' }}>
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl bg-white p-6 shadow-lg md:p-8">

            {/* En-tête global */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--mase-heading)] sm:text-3xl">
                  Générateur de Politique SSE — MASE
                </h1>
                <p className="mt-1 text-sm text-[var(--mase-muted)]">
                  Outil MVP pour créer une politique Santé, Sécurité, Environnement conforme aux exigences MASE.
                </p>
              </div>
              <AuthButton session={session} />
            </div>

            {/* Stepper global */}
            <div className="mt-6 rounded-2xl bg-[var(--mase-card-strong)] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--mase-primary)]">
                    ÉTAPE {stepIndex + 1} / {STEPS.length}
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--mase-muted)]">{STEPS[stepIndex].label}</p>
                </div>
                <p className="shrink-0 text-sm text-[var(--mase-muted)]">
                  {answeredCount} / {QUESTIONS.length} questions remplies
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--mase-primary-light)]/40">
                <div
                  className="h-full rounded-full bg-[var(--mase-primary)] transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Message paiement en attente */}
            {paymentPending && !hasPurchase && !accessLoading && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Paiement reçu, vérification en cours… rechargez la page dans quelques instants si l'accès ne s'ouvre pas automatiquement.
              </div>
            )}

            {/* Contenu de l'étape */}
            <div className="mt-6">
              {step === 'welcome' && (
                <Welcome
                  onNext={handleStart}
                  savedAnswers={savedAnswers}
                  onResume={handleResume}
                />
              )}
              {step === 'questionnaire' && (
                <Questionnaire
                  questions={QUESTIONS}
                  answers={answers}
                  setAnswer={setAnswer}
                  onBack={() => setStep('welcome')}
                  onContinue={() => setStep('company')}
                  onSaveAnswers={handleSaveAnswers}
                />
              )}
              {step === 'company' && (
                <CompanyInfoForm
                  companyInfo={companyInfo}
                  setCompanyInfo={setCompanyInfo}
                  onBack={() => setStep('questionnaire')}
                  onNext={goToPreview}
                />
              )}
              {step === 'preview' && (
                <PolicyPreview
                  companyInfo={companyInfo}
                  selectedBlocks={selectedBlocks}
                  isEnhanced={isEnhanced}
                  isEnhancing={isEnhancing}
                  enhanceError={enhanceError}
                  onEnhance={handleEnhance}
                  onBack={() => setStep('company')}
                  onRestart={handleRestart}
                  onDownload={() => downloadPolicyDocx(selectedBlocks, companyInfo)}
                />
              )}
            </div>

          </div>
        </div>

        {/* Overlay de gating */}
        {showGate && (
          <AccessGate
            session={session}
            onClose={() => setShowGate(false)}
          />
        )}
      </div>
    );
  }
  ```

- [ ] **Étape 2 : Vérifier que TypeScript compile**

  ```bash
  npx tsc --noEmit
  ```

  Résultat attendu : aucune erreur.

- [ ] **Étape 3 : Commit**

  ```bash
  git add src/App.tsx
  git commit -m "feat: gating Stripe + polling retour paiement + sauvegarde réponses"
  ```

---

## Task 9 : Modifier `src/components/Welcome.tsx`

**Files:**
- Modifier : `src/components/Welcome.tsx`

**Contexte actuel :** `Welcome` reçoit seulement `onNext: () => void`. On y ajoute `savedAnswers` et `onResume`.

- [ ] **Étape 1 : Remplacer `src/components/Welcome.tsx`**

  ```typescript
  interface Props {
    onNext: () => void;
    savedAnswers: Record<string, string> | null;
    onResume: () => void;
  }

  export default function Welcome({ onNext, savedAnswers, onResume }: Props) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-[var(--mase-heading)]">
            Bienvenue dans l'outil Politique SSE
          </h2>
          <p className="mt-2 text-[var(--mase-muted)]">
            Ce générateur guide l'entreprise à travers un diagnostic SSE, puis crée une politique
            personnalisée prête à télécharger en DOCX.
          </p>
        </div>

        <ul className="space-y-2 text-[var(--mase-text)]">
          <li>• Diagnostic SWOT + PESTEL SSE (~20 questions)</li>
          <li>• Calcul de la maturité et sélection de blocs conditionnels</li>
          <li>• Aperçu du document et export Word</li>
        </ul>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          {savedAnswers && (
            <button
              type="button"
              onClick={onResume}
              className="rounded-full border border-[var(--mase-primary)] px-6 py-3 text-sm font-semibold text-[var(--mase-primary)] transition hover:bg-[var(--mase-primary-light)]/20"
            >
              Reprendre mon diagnostic
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="rounded-full bg-[var(--mase-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--mase-primary-dark)]"
          >
            Démarrer le diagnostic
          </button>
        </div>
      </div>
    );
  }
  ```

- [ ] **Étape 2 : Vérifier que TypeScript compile**

  ```bash
  npx tsc --noEmit
  ```

  Résultat attendu : aucune erreur.

- [ ] **Étape 3 : Commit**

  ```bash
  git add src/components/Welcome.tsx
  git commit -m "feat: Welcome - bouton Reprendre mon diagnostic"
  ```

---

## Task 10 : Modifier `src/components/Questionnaire.tsx`

**Files:**
- Modifier : `src/components/Questionnaire.tsx`

**Contexte actuel :** Le bouton final appelle `onContinue()`. On ajoute `onSaveAnswers` qui est appelé juste avant `onContinue` (best-effort, erreur silencieuse).

- [ ] **Étape 1 : Modifier l'interface Props**

  Dans `src/components/Questionnaire.tsx`, remplacer l'interface Props :

  ```typescript
  interface Props {
    questions: Question[];
    answers: Record<string, string>;
    setAnswer: (questionId: string, choiceValue: string) => void;
    onBack: () => void;
    onContinue: () => void;
    onSaveAnswers: (answers: Record<string, string>) => void;
  }
  ```

- [ ] **Étape 2 : Mettre à jour la signature de la fonction**

  ```typescript
  export function Questionnaire({ questions, answers, setAnswer, onBack, onContinue, onSaveAnswers }: Props) {
  ```

- [ ] **Étape 3 : Modifier le handler du bouton "Voir les infos entreprise"**

  Remplacer le bloc `onClick` du bouton de navigation dans le JSX :

  ```typescript
  onClick={() => {
    if (!canContinue) return;
    if (page < pageCount - 1) {
      setPage((current) => current + 1);
    } else {
      // Sauvegarde best-effort avant de continuer
      onSaveAnswers(answers);
      onContinue();
    }
  }}
  ```

- [ ] **Étape 4 : Vérifier que TypeScript compile**

  ```bash
  npx tsc --noEmit
  ```

  Résultat attendu : aucune erreur.

- [ ] **Étape 5 : Commit**

  ```bash
  git add src/components/Questionnaire.tsx
  git commit -m "feat: Questionnaire - sauvegarde des réponses avant continuer"
  ```

---

## Task 11 : Déployer les Edge Functions

**Files:**
- Aucun fichier — déploiement via outil Supabase MCP.

- [ ] **Étape 1 : Déployer `create-checkout-session`**

  Utiliser `mcp__claude_ai_Supabase__deploy_edge_function` avec :
  - projet : `ulceeurwibmbtnqhkaao`
  - nom : `create-checkout-session`
  - code : contenu de `supabase/functions/create-checkout-session/index.ts`

- [ ] **Étape 2 : Déployer `stripe-webhook`**

  Utiliser `mcp__claude_ai_Supabase__deploy_edge_function` avec :
  - projet : `ulceeurwibmbtnqhkaao`
  - nom : `stripe-webhook`
  - code : contenu de `supabase/functions/stripe-webhook/index.ts`

- [ ] **Étape 3 : Vérifier le déploiement**

  Utiliser `mcp__claude_ai_Supabase__list_edge_functions` pour confirmer que les deux fonctions apparaissent.

  Récupérer l'URL de `stripe-webhook` — elle aura la forme :
  ```
  https://ulceeurwibmbtnqhkaao.supabase.co/functions/v1/stripe-webhook
  ```
  Conserver cette URL pour Task 12.

---

## Task 12 : Configurer le webhook Stripe

**Files:**
- Aucun fichier de code — configuration Stripe dashboard.

- [ ] **Étape 1 : Créer le webhook dans Stripe**

  Ouvrir `https://dashboard.stripe.com/webhooks` → "Add endpoint".
  - Endpoint URL : `https://ulceeurwibmbtnqhkaao.supabase.co/functions/v1/stripe-webhook`
  - Events à écouter : `checkout.session.completed`

- [ ] **Étape 2 : Copier le Webhook Signing Secret**

  Après création, Stripe affiche un secret commençant par `whsec_...`.
  Copier cette valeur.

- [ ] **Étape 3 : Ajouter STRIPE_WEBHOOK_SECRET dans les secrets Supabase**

  Ouvrir `https://supabase.com/dashboard/project/ulceeurwibmbtnqhkaao/functions/secrets`.
  Ajouter : `STRIPE_WEBHOOK_SECRET` = `whsec_...`

---

## Task 13 : Test end-to-end

- [ ] **Étape 1 : Test — utilisateur non connecté**

  Démarrer l'app (`npm run dev`). En mode navigation privée (pas de session active).
  Cliquer "Démarrer le diagnostic".
  Résultat attendu : overlay `AccessGate` affiché avec "Connexion requise" et bouton Google.

- [ ] **Étape 2 : Test — connexion OAuth**

  Cliquer "Se connecter avec Google", compléter le flow.
  Résultat attendu : retour sur l'app, session active, overlay maintenant en mode "Accès à l'outil" avec prix 29 €.

- [ ] **Étape 3 : Test — flux paiement Stripe (mode test)**

  Cliquer "Accéder pour 29 €".
  Résultat attendu : redirect vers page Stripe.
  Utiliser la carte test Stripe : `4242 4242 4242 4242`, expiry `12/34`, CVC `123`.
  Résultat attendu après paiement : retour sur l'app, accès au questionnaire déverrouillé automatiquement.

- [ ] **Étape 4 : Test — sauvegarde et reprise**

  Remplir le questionnaire jusqu'à la dernière page, cliquer "Voir les infos entreprise".
  Fermer l'onglet, rouvrir l'app, se reconnecter.
  Résultat attendu : bouton "Reprendre mon diagnostic" visible sur l'écran d'accueil, clic → arrivée directe à l'étape "Infos entreprise" avec les réponses chargées.

- [ ] **Étape 5 : Test — utilisateur déjà payant**

  Se déconnecter puis se reconnecter (même compte Google).
  Cliquer "Démarrer le diagnostic".
  Résultat attendu : accès direct au questionnaire, sans overlay ni paiement.

- [ ] **Étape 6 : Vérifier les logs Edge Functions**

  Utiliser `mcp__claude_ai_Supabase__get_logs` pour `create-checkout-session` et `stripe-webhook` — vérifier l'absence d'erreurs.
