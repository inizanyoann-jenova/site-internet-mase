# SMI Dashboard — Phase 1 : Infrastructure Multi-Tenant

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place toute l'infrastructure nécessaire pour vendre le SMI Dashboard en SaaS multi-tenant : tables Supabase `companies`/`company_members`, paiement abonnement Stripe, onboarding entreprise, gestion d'équipe, et mise à jour de la homepage.

**Architecture:** Intégration dans `site-internet-mase` existant (même Supabase, même Vercel). Chaque entreprise cliente obtient un espace isolé via `company_id` sur toutes les tables. Le webhook Stripe est la seule source de vérité pour les statuts d'abonnement. `qhse-dashboard2` n'est jamais touché.

**Tech Stack:** React 19 · TypeScript · Tailwind v4 · Supabase (Postgres + Auth + Edge Functions Deno) · Stripe · Vitest · React Testing Library

> **Phases suivantes :** Phase 2 (6 modules critiques MASE) et Phase 3 (6 modules importants) sont des plans séparés à créer après livraison de cette Phase 1.

---

## Structure des fichiers

### Nouveaux fichiers
- `supabase/migrations/20260602000010_companies.sql` — tables companies + company_members + fonction get_user_company_id() + RLS
- `supabase/functions/invite-company-member/index.ts` — Edge Function envoi email invitation
- `src/hooks/useCompany.ts` — hook qui retourne la company et membership de l'utilisateur courant
- `src/pages/DashboardPage.tsx` — shell principal du dashboard avec sidebar et garde d'accès
- `src/pages/DashboardOnboardingPage.tsx` — formulaire de configuration entreprise après achat
- `src/pages/DashboardJoinPage.tsx` — page d'acceptation d'invitation (/dashboard/rejoindre?token=...)
- `src/pages/DashboardTeamPage.tsx` — gestion de l'équipe (invitations, rôles, révocation)
- `src/components/dashboard/DashboardLayout.tsx` — layout avec sidebar persistante
- `src/components/dashboard/DashboardSidebar.tsx` — navigation latérale avec groupes de modules
- `src/components/dashboard/DashboardGuard.tsx` — composant de protection (redirige si pas d'accès)
- `src/hooks/useCompany.test.ts` — tests unitaires du hook

### Fichiers modifiés
- `supabase/functions/create-checkout-session/index.ts` — support mode abonnement + nouveaux tarifs
- `supabase/functions/stripe-webhook/index.ts` — gestion subscriptions + création company
- `src/main.tsx` — ajout des nouvelles routes /dashboard/*
- `src/pages/HomePage.tsx` — mise à jour prix (19€) + 2 nouvelles cartes (SMI Dashboard + Pack)

---

## Task 1 : Migration SQL — companies + company_members + RLS

**Files:**
- Create: `supabase/migrations/20260602000010_companies.sql`

- [ ] **Step 1 : Créer la migration SQL**

```sql
-- supabase/migrations/20260602000010_companies.sql

-- Table des entreprises clientes
create table if not exists companies (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  siret                text,
  admin_user_id        uuid references auth.users not null,
  stripe_customer_id   text unique,
  subscription_status  text not null default 'pending',
  tool_slug            text not null,
  created_at           timestamptz default now()
);

-- Contrainte : statuts valides
alter table companies
  add constraint companies_status_check
  check (subscription_status in ('pending', 'active', 'lifetime', 'canceled', 'past_due'));

-- Table des membres d'une entreprise
create table if not exists company_members (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid references companies not null,
  user_id           uuid references auth.users,
  email             text not null,
  role              text not null default 'lecteur',
  invitation_token  uuid unique,
  invited_at        timestamptz default now(),
  accepted_at       timestamptz
);

-- Contrainte : rôles valides
alter table company_members
  add constraint company_members_role_check
  check (role in ('admin', 'responsable_qhse', 'direction', 'lecteur', 'operateur'));

-- Index pour performances
create index on company_members (user_id);
create index on company_members (invitation_token) where invitation_token is not null;

-- Fonction helper : retourne le company_id de l'utilisateur courant (actif)
create or replace function get_user_company_id()
returns uuid
language sql
security definer
stable
as $$
  select cm.company_id
  from company_members cm
  join companies c on c.id = cm.company_id
  where cm.user_id = auth.uid()
    and cm.accepted_at is not null
    and c.subscription_status in ('active', 'lifetime')
  limit 1
$$;

-- RLS sur companies
alter table companies enable row level security;

create policy "Lecture membres actifs"
  on companies for select
  using (
    id = get_user_company_id()
    or admin_user_id = auth.uid()
  );

-- RLS sur company_members
alter table company_members enable row level security;

create policy "Lecture membres de sa company"
  on company_members for select
  using (company_id = get_user_company_id());

create policy "Admin peut inviter"
  on company_members for insert
  with check (
    company_id = get_user_company_id()
    and exists (
      select 1 from company_members cm2
      where cm2.company_id = company_id
        and cm2.user_id = auth.uid()
        and cm2.role = 'admin'
        and cm2.accepted_at is not null
    )
  );

create policy "Admin peut modifier les rôles"
  on company_members for update
  using (
    company_id = get_user_company_id()
    and exists (
      select 1 from company_members cm2
      where cm2.company_id = company_id
        and cm2.user_id = auth.uid()
        and cm2.role = 'admin'
        and cm2.accepted_at is not null
    )
  );

-- L'utilisateur peut accepter sa propre invitation (met à jour son user_id + accepted_at)
create policy "Accepter sa propre invitation"
  on company_members for update
  using (
    invitation_token is not null
    and email = (select email from auth.users where id = auth.uid())
  );
```

- [ ] **Step 2 : Appliquer la migration sur Supabase**

```bash
npx supabase db push
```

Vérifier dans Supabase Studio → Tables que `companies` et `company_members` apparaissent avec les colonnes correctes.

- [ ] **Step 3 : Commit**

```bash
git add supabase/migrations/20260602000010_companies.sql
git commit -m "feat(db): add companies and company_members tables with RLS"
```

---

## Task 2 : Mise à jour create-checkout-session — mode abonnement

**Files:**
- Modify: `supabase/functions/create-checkout-session/index.ts`

- [ ] **Step 1 : Réécrire la fonction pour supporter les abonnements**

Remplacer **tout le contenu** de `supabase/functions/create-checkout-session/index.ts` par :

```typescript
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

interface Body {
  user_id: string;
  email: string;
  tool_slug: string;
  tool_name: string;
  success_path?: string;
  mode: 'payment' | 'subscription';
  unit_amount: number;
  interval?: 'month' | 'year';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: Body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Corps de requête JSON invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { user_id, email, tool_slug, tool_name, mode, unit_amount } = body;
    const success_path = body.success_path ?? '/';
    const appUrl = Deno.env.get('APP_URL')!;

    const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
      currency: 'eur',
      product_data: { name: tool_name },
      unit_amount,
      ...(mode === 'subscription' && body.interval
        ? { recurring: { interval: body.interval } }
        : {}),
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: priceData, quantity: 1 }],
      mode,
      success_url: `${appUrl}${success_path}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/`,
      customer_email: email,
      metadata: { user_id, tool_slug },
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

- [ ] **Step 2 : Déployer la fonction mise à jour**

```bash
npx supabase functions deploy create-checkout-session
```

- [ ] **Step 3 : Commit**

```bash
git add supabase/functions/create-checkout-session/index.ts
git commit -m "feat(stripe): support subscription mode in create-checkout-session"
```

---

## Task 3 : Mise à jour stripe-webhook — subscriptions + création company

**Files:**
- Modify: `supabase/functions/stripe-webhook/index.ts`

- [ ] **Step 1 : Réécrire le webhook pour gérer subscriptions et companies**

Remplacer **tout le contenu** de `supabase/functions/stripe-webhook/index.ts` par :

```typescript
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const DASHBOARD_SLUGS = ['smi-dashboard', 'pack-mase-complet'];

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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const toolSlug = session.metadata?.tool_slug ?? 'politique-sse';

    if (!userId) {
      console.error('user_id manquant dans les metadata Stripe');
      return new Response('user_id manquant', { status: 400 });
    }

    if (DASHBOARD_SLUGS.includes(toolSlug)) {
      // Créer la company et le membership admin
      const subscriptionStatus = session.mode === 'subscription' ? 'active' : 'lifetime';
      const stripeCustomerId = typeof session.customer === 'string' ? session.customer : null;

      const { data: company, error: companyErr } = await supabase
        .from('companies')
        .insert({
          admin_user_id: userId,
          stripe_customer_id: stripeCustomerId,
          subscription_status: subscriptionStatus,
          tool_slug: toolSlug,
          name: 'Mon entreprise', // sera mis à jour lors de l'onboarding
        })
        .select('id')
        .single();

      if (companyErr) {
        console.error('Erreur création company:', companyErr.message);
        return new Response('Erreur base de données', { status: 500 });
      }

      // Récupérer l'email de l'utilisateur
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const email = userData?.user?.email ?? '';

      const { error: memberErr } = await supabase
        .from('company_members')
        .insert({
          company_id: company.id,
          user_id: userId,
          email,
          role: 'admin',
          accepted_at: new Date().toISOString(),
        });

      if (memberErr) {
        console.error('Erreur création membre admin:', memberErr.message);
        return new Response('Erreur base de données', { status: 500 });
      }
    } else {
      // Outils existants (politique-sse, matrice-polyvalence) : insert purchases
      if (!session.amount_total) {
        console.error('amount_total absent dans la session Stripe');
        return new Response('amount_total manquant', { status: 400 });
      }

      const { error } = await supabase.from('purchases').insert({
        user_id: userId,
        stripe_session_id: session.id,
        amount_cents: session.amount_total,
        tool_slug: toolSlug,
      });

      if (error) {
        console.error('Erreur DB:', error.message);
        return new Response('Erreur base de données', { status: 500 });
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

    await supabase
      .from('companies')
      .update({ subscription_status: 'canceled' })
      .eq('stripe_customer_id', customerId);
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

    const status = subscription.status === 'active' ? 'active' : subscription.status;

    await supabase
      .from('companies')
      .update({ subscription_status: status })
      .eq('stripe_customer_id', customerId);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 2 : Ajouter les nouveaux événements dans le webhook Stripe Dashboard**

Dans Stripe Dashboard → Developers → Webhooks → sélectionner l'endpoint existant → ajouter les événements :
- `customer.subscription.deleted`
- `customer.subscription.updated`

- [ ] **Step 3 : Déployer le webhook**

```bash
npx supabase functions deploy stripe-webhook
```

- [ ] **Step 4 : Commit**

```bash
git add supabase/functions/stripe-webhook/index.ts
git commit -m "feat(stripe): handle subscriptions and company creation in webhook"
```

---

## Task 4 : Edge Function invite-company-member

**Files:**
- Create: `supabase/functions/invite-company-member/index.ts`

- [ ] **Step 1 : Créer la fonction d'invitation**

```typescript
// supabase/functions/invite-company-member/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { company_id: string; email: string; role: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON invalide' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Vérifier que l'appelant est admin de la company
  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Token invalide' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: membership } = await supabase
    .from('company_members')
    .select('role')
    .eq('company_id', body.company_id)
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .not('accepted_at', 'is', null)
    .maybeSingle();

  if (!membership) {
    return new Response(JSON.stringify({ error: 'Accès refusé — admin requis' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Générer un token d'invitation unique
  const invitationToken = crypto.randomUUID();

  const { error: insertErr } = await supabase.from('company_members').insert({
    company_id: body.company_id,
    email: body.email,
    role: body.role,
    invitation_token: invitationToken,
  });

  if (insertErr) {
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Envoyer l'email via Supabase Auth invite (ou SMTP si configuré)
  const appUrl = Deno.env.get('APP_URL')!;
  const inviteUrl = `${appUrl}/dashboard/rejoindre?token=${invitationToken}`;

  // Utiliser le système d'email de Supabase Auth
  const { error: emailErr } = await supabase.auth.admin.inviteUserByEmail(body.email, {
    data: { invite_url: inviteUrl },
    redirectTo: inviteUrl,
  });

  if (emailErr) {
    console.error('Email invitation error:', emailErr.message);
    // Ne pas bloquer : le token est créé, l'admin peut partager le lien manuellement
  }

  return new Response(JSON.stringify({ success: true, invite_url: inviteUrl }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 2 : Déployer la fonction**

```bash
npx supabase functions deploy invite-company-member
```

- [ ] **Step 3 : Commit**

```bash
git add supabase/functions/invite-company-member/index.ts
git commit -m "feat(functions): add invite-company-member edge function"
```

---

## Task 5 : Hook useCompany

**Files:**
- Create: `src/hooks/useCompany.ts`
- Create: `src/hooks/useCompany.test.ts`

- [ ] **Step 1 : Écrire le test en premier**

```typescript
// src/hooks/useCompany.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCompany } from './useCompany';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '../lib/supabase';

const mockSession = {
  user: { id: 'user-123', email: 'test@test.com' },
} as any;

const mockCompany = {
  id: 'company-abc',
  name: 'ACME SAS',
  subscription_status: 'active',
  tool_slug: 'smi-dashboard',
};

const mockMembership = {
  id: 'member-1',
  company_id: 'company-abc',
  user_id: 'user-123',
  email: 'test@test.com',
  role: 'admin',
  accepted_at: '2026-06-02T10:00:00Z',
  company: mockCompany,
};

describe('useCompany', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne null quand pas de session', async () => {
    const { result } = renderHook(() => useCompany(null));
    expect(result.current.company).toBeNull();
    expect(result.current.membership).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('retourne la company et le membership pour un utilisateur membre', async () => {
    const mockSelect = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockMembership, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(mockSelect as any);

    const { result } = renderHook(() => useCompany(mockSession));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.membership?.role).toBe('admin');
    expect(result.current.company?.name).toBe('ACME SAS');
  });

  it('retourne null quand aucun membership trouvé', async () => {
    const mockSelect = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(mockSelect as any);

    const { result } = renderHook(() => useCompany(mockSession));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.company).toBeNull();
    expect(result.current.membership).toBeNull();
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npm test -- useCompany
```

Résultat attendu : FAIL — `Cannot find module './useCompany'`

- [ ] **Step 3 : Implémenter le hook**

```typescript
// src/hooks/useCompany.ts
import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Company {
  id: string;
  name: string;
  siret: string | null;
  subscription_status: string;
  tool_slug: string;
  admin_user_id: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  email: string;
  role: 'admin' | 'responsable_qhse' | 'direction' | 'lecteur' | 'operateur';
  accepted_at: string;
  company: Company;
}

interface CompanyState {
  company: Company | null;
  membership: CompanyMember | null;
  isLoading: boolean;
}

export function useCompany(session: Session | null): CompanyState & { refetch: () => void } {
  const [state, setState] = useState<CompanyState>({
    company: null,
    membership: null,
    isLoading: false,
  });

  const fetch = useCallback(async () => {
    if (!session) {
      setState({ company: null, membership: null, isLoading: false });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const { data, error } = await supabase
        .from('company_members')
        .select('*, company:companies(*)')
        .eq('user_id', session.user.id)
        .not('accepted_at', 'is', null)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setState({ company: null, membership: null, isLoading: false });
        return;
      }

      const { company, ...membershipData } = data;
      setState({
        company: company as Company,
        membership: { ...membershipData, company } as CompanyMember,
        isLoading: false,
      });
    } catch {
      setState({ company: null, membership: null, isLoading: false });
    }
  }, [session]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...state, refetch: fetch };
}
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

```bash
npm test -- useCompany
```

Résultat attendu : 3 tests PASS

- [ ] **Step 5 : Commit**

```bash
git add src/hooks/useCompany.ts src/hooks/useCompany.test.ts
git commit -m "feat(hooks): add useCompany hook with tests"
```

---

## Task 6 : DashboardLayout + DashboardSidebar + DashboardGuard

**Files:**
- Create: `src/components/dashboard/DashboardLayout.tsx`
- Create: `src/components/dashboard/DashboardSidebar.tsx`
- Create: `src/components/dashboard/DashboardGuard.tsx`

- [ ] **Step 1 : Créer DashboardSidebar**

```tsx
// src/components/dashboard/DashboardSidebar.tsx
import { Link, useLocation } from 'react-router-dom';
import type { Company, CompanyMember } from '../../hooks/useCompany';

interface SidebarItem {
  path: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const SIDEBAR_GROUPS: { label: string; items: SidebarItem[] }[] = [
  {
    label: 'Pilotage',
    items: [
      { path: '/dashboard', label: 'Vue Direction', icon: '🏭' },
      { path: '/dashboard/kpis', label: 'KPIs Sécurité', icon: '📊' },
      { path: '/dashboard/objectifs', label: 'Objectifs QHSE', icon: '🎯' },
    ],
  },
  {
    label: 'Sécurité',
    items: [
      { path: '/dashboard/duerp', label: 'DUERP', icon: '📋' },
      { path: '/dashboard/accidents', label: 'Accidents', icon: '🚨' },
      { path: '/dashboard/habilitations', label: 'Habilitations', icon: '🏅' },
      { path: '/dashboard/actions', label: 'Plan d\'actions', icon: '✅' },
    ],
  },
  {
    label: 'Qualité / RH',
    items: [
      { path: '/dashboard/audits', label: 'Audits & NC', icon: '🔍' },
      { path: '/dashboard/rh', label: 'Social RH', icon: '👥' },
      { path: '/dashboard/reunions', label: 'Réunions QHSE', icon: '📅' },
    ],
  },
  {
    label: 'Direction',
    items: [
      { path: '/dashboard/revue', label: 'Revue de Direction', icon: '📝' },
      { path: '/dashboard/export', label: 'Export Excel/PDF', icon: '📤' },
    ],
  },
];

interface Props {
  company: Company;
  membership: CompanyMember;
  onClose?: () => void;
}

export function DashboardSidebar({ company, membership, onClose }: Props) {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col bg-[var(--mase-primary)] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-4">
        <div className="text-xs font-bold uppercase tracking-widest text-white/50">
          SMI Dashboard
        </div>
        <div className="mt-1 truncate text-sm font-semibold text-white">
          {company.name}
        </div>
        <div className="mt-0.5 text-xs text-white/50 capitalize">
          {membership.role.replace('_', ' ')}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
              {group.label}
            </div>
            {group.items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-white/15 font-semibold text-white'
                      : 'text-white/70 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-2 py-3">
        {membership.role === 'admin' && (
          <Link
            to="/dashboard/equipe"
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/8 hover:text-white"
          >
            <span>⚙️</span>
            <span>Mon équipe</span>
          </Link>
        )}
        <Link
          to="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/50 transition-colors hover:text-white/70"
        >
          <span>←</span>
          <span>Retour au site</span>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Créer DashboardLayout**

```tsx
// src/components/dashboard/DashboardLayout.tsx
import { useState } from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import type { Company, CompanyMember } from '../../hooks/useCompany';

interface Props {
  company: Company;
  membership: CompanyMember;
  children: React.ReactNode;
}

export function DashboardLayout({ company, membership, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f3]">
      {/* Sidebar desktop */}
      <div className="hidden w-56 shrink-0 lg:block">
        <DashboardSidebar company={company} membership={membership} />
      </div>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-56 transition-transform lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <DashboardSidebar
          company={company}
          membership={membership}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Contenu principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header mobile */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1 text-slate-600 hover:bg-slate-100"
          >
            ☰
          </button>
          <span className="text-sm font-semibold text-[var(--mase-heading)]">
            {company.name}
          </span>
        </div>

        {/* Zone de contenu scrollable */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3 : Créer DashboardGuard**

```tsx
// src/components/dashboard/DashboardGuard.tsx
import { Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { useCompany } from '../../hooks/useCompany';
import { DashboardLayout } from './DashboardLayout';

interface Props {
  session: Session | null;
  children: React.ReactNode;
}

export function DashboardGuard({ session, children }: Props) {
  const { company, membership, isLoading } = useCompany(session);

  if (!session) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3]">
        <div className="text-sm text-slate-500">Chargement…</div>
      </div>
    );
  }

  if (!company || !membership) {
    // Achat effectué mais pas encore d'entreprise → onboarding
    return <Navigate to="/dashboard/onboarding" replace />;
  }

  return (
    <DashboardLayout company={company} membership={membership}>
      {children}
    </DashboardLayout>
  );
}
```

- [ ] **Step 4 : Commit**

```bash
git add src/components/dashboard/
git commit -m "feat(dashboard): add DashboardLayout, DashboardSidebar, DashboardGuard"
```

---

## Task 7 : DashboardPage (shell principal)

**Files:**
- Create: `src/pages/DashboardPage.tsx`

- [ ] **Step 1 : Créer la page principale du dashboard**

```tsx
// src/pages/DashboardPage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';

interface Props {
  session: Session | null;
}

export default function DashboardPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <div>
        <h1 className="text-xl font-bold text-[var(--mase-heading)]">
          Vue Direction
        </h1>
        <p className="mt-2 text-sm text-[var(--mase-muted)]">
          Les modules arrivent dans la Phase 2. L'infrastructure est en place.
        </p>
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">
            🚧 Les modules DUERP, Plan d'actions, Accidents, Habilitations, KPIs et Revue de Direction sont en cours de développement.
          </p>
        </div>
      </div>
    </DashboardGuard>
  );
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat(dashboard): add DashboardPage shell with access guard"
```

---

## Task 8 : DashboardOnboardingPage

**Files:**
- Create: `src/pages/DashboardOnboardingPage.tsx`

- [ ] **Step 1 : Créer la page d'onboarding**

Cette page s'affiche après un achat réussi, quand la company existe mais n'a pas encore de nom renseigné.

```tsx
// src/pages/DashboardOnboardingPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Props {
  session: Session | null;
}

export default function DashboardOnboardingPage({ session }: Props) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [siret, setSiret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    if (!session) {
      navigate('/');
      return;
    }

    // Vérifier si l'utilisateur a une company (peut-être webhook pas encore arrivé)
    const check = async () => {
      const { data } = await supabase
        .from('company_members')
        .select('company_id, company:companies(id, name)')
        .eq('user_id', session.user.id)
        .not('accepted_at', 'is', null)
        .maybeSingle();

      if (data?.company_id) {
        setCompanyId(data.company_id);
        // Si la company a déjà un nom (pas le nom par défaut), aller au dashboard
        const companyName = (data.company as any)?.name;
        if (companyName && companyName !== 'Mon entreprise') {
          navigate('/dashboard');
          return;
        }
      }
      setCheckingAccess(false);
    };

    check();
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !companyId) return;

    setLoading(true);
    setError(null);

    const { error: updateErr } = await supabase
      .from('companies')
      .update({ name: name.trim(), siret: siret.trim() || null })
      .eq('id', companyId);

    setLoading(false);

    if (updateErr) {
      setError('Impossible de sauvegarder. Vérifiez votre connexion.');
      return;
    }

    navigate('/dashboard');
  };

  if (checkingAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3]">
        <div className="text-sm text-slate-500">Vérification de votre accès…</div>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3] p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <div className="text-3xl mb-4">⏳</div>
          <h1 className="text-lg font-bold text-[var(--mase-heading)]">
            Paiement en cours de validation
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            La confirmation Stripe peut prendre quelques instants. Rechargez la page dans 30 secondes.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full px-6 py-2 text-sm font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: 'var(--mase-primary)' }}
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3] p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <div className="mb-6 text-center">
            <div className="text-3xl mb-2">🏭</div>
            <h1 className="text-xl font-bold text-[var(--mase-heading)]">
              Configurez votre entreprise
            </h1>
            <p className="mt-1 text-sm text-[var(--mase-muted)]">
              Ces informations apparaîtront dans vos documents QHSE
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--mase-heading)] mb-1">
                Nom de l'entreprise *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="ACME SAS"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--mase-primary)] focus:ring-1 focus:ring-[var(--mase-primary)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--mase-heading)] mb-1">
                SIRET <span className="text-slate-400 font-normal">(optionnel)</span>
              </label>
              <input
                type="text"
                value={siret}
                onChange={(e) => setSiret(e.target.value)}
                placeholder="12345678900012"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--mase-primary)] focus:ring-1 focus:ring-[var(--mase-primary)]"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="mt-2 w-full rounded-full py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--mase-primary)' }}
            >
              {loading ? 'Enregistrement…' : 'Accéder à mon dashboard →'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-400">
            Vous pourrez inviter votre équipe depuis le dashboard
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/pages/DashboardOnboardingPage.tsx
git commit -m "feat(dashboard): add onboarding page for company setup"
```

---

## Task 9 : DashboardJoinPage — acceptation d'invitation

**Files:**
- Create: `src/pages/DashboardJoinPage.tsx`

- [ ] **Step 1 : Créer la page d'acceptation d'invitation**

```tsx
// src/pages/DashboardJoinPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthButton } from '../components/AuthButton';

interface Props {
  session: Session | null;
}

export default function DashboardJoinPage({ session }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Lien d\'invitation invalide ou expiré.');
      return;
    }

    if (!session) return; // Attendre la connexion

    const accept = async () => {
      setStatus('loading');

      // Vérifier que le token existe et correspond à l'email de l'utilisateur
      const { data: invitation, error: findErr } = await supabase
        .from('company_members')
        .select('id, email, company_id')
        .eq('invitation_token', token)
        .is('accepted_at', null)
        .maybeSingle();

      if (findErr || !invitation) {
        setStatus('error');
        setErrorMsg('Ce lien d\'invitation est invalide ou a déjà été utilisé.');
        return;
      }

      if (invitation.email.toLowerCase() !== session.user.email?.toLowerCase()) {
        setStatus('error');
        setErrorMsg(`Ce lien est destiné à ${invitation.email}. Connectez-vous avec ce compte.`);
        return;
      }

      // Accepter l'invitation
      const { error: updateErr } = await supabase
        .from('company_members')
        .update({
          user_id: session.user.id,
          accepted_at: new Date().toISOString(),
          invitation_token: null,
        })
        .eq('id', invitation.id);

      if (updateErr) {
        setStatus('error');
        setErrorMsg('Erreur lors de l\'acceptation. Réessayez.');
        return;
      }

      setStatus('success');
      setTimeout(() => navigate('/dashboard'), 2000);
    };

    accept();
  }, [token, session, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3] p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
        {!session && (
          <>
            <div className="text-3xl mb-4">🔐</div>
            <h1 className="text-xl font-bold text-[var(--mase-heading)]">
              Invitation au dashboard MASE
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Connectez-vous pour rejoindre l'équipe
            </p>
            <div className="mt-6 flex justify-center">
              <AuthButton session={session} />
            </div>
          </>
        )}

        {session && status === 'loading' && (
          <>
            <div className="text-3xl mb-4">⏳</div>
            <p className="text-sm text-slate-500">Validation de votre invitation…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-3xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-[var(--mase-heading)]">
              Invitation acceptée !
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Redirection vers le dashboard…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-3xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-[var(--mase-heading)]">
              Lien invalide
            </h1>
            <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 rounded-full px-6 py-2 text-sm font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: 'var(--mase-primary)' }}
            >
              Retour à l'accueil
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/pages/DashboardJoinPage.tsx
git commit -m "feat(dashboard): add invitation acceptance page"
```

---

## Task 10 : DashboardTeamPage — gestion de l'équipe

**Files:**
- Create: `src/pages/DashboardTeamPage.tsx`

- [ ] **Step 1 : Créer la page de gestion d'équipe**

```tsx
// src/pages/DashboardTeamPage.tsx
import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';

const ROLES = ['admin', 'responsable_qhse', 'direction', 'lecteur', 'operateur'] as const;
type Role = typeof ROLES[number];

interface Member {
  id: string;
  email: string;
  role: Role;
  accepted_at: string | null;
  user_id: string | null;
}

interface Props {
  session: Session | null;
}

function TeamContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('lecteur');
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isAdmin = membership?.role === 'admin';

  useEffect(() => {
    if (!company) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('company_members')
        .select('id, email, role, accepted_at, user_id')
        .eq('company_id', company.id)
        .order('invited_at', { ascending: true });
      setMembers((data as Member[]) ?? []);
      setLoading(false);
    };
    load();
  }, [company]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !inviteEmail.trim()) return;

    setInviting(true);
    setError(null);
    setSuccessMsg(null);

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const token = currentSession?.access_token;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-company-member`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_id: company.id,
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      },
    );

    setInviting(false);

    if (!res.ok) {
      const err = await res.json();
      setError(err.error ?? 'Erreur lors de l\'invitation');
      return;
    }

    const result = await res.json();
    setSuccessMsg(`Invitation envoyée à ${inviteEmail}`);
    if (result.invite_url) {
      setSuccessMsg(`Invitation envoyée à ${inviteEmail}. Lien : ${result.invite_url}`);
    }
    setInviteEmail('');

    // Recharger les membres
    const { data } = await supabase
      .from('company_members')
      .select('id, email, role, accepted_at, user_id')
      .eq('company_id', company.id)
      .order('invited_at', { ascending: true });
    setMembers((data as Member[]) ?? []);
  };

  const handleRevokeOrRemove = async (memberId: string) => {
    if (!confirm('Supprimer ce membre ?')) return;
    await supabase.from('company_members').delete().eq('id', memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--mase-heading)]">Mon équipe</h1>
      <p className="mt-1 text-sm text-[var(--mase-muted)]">
        {members.filter((m) => m.accepted_at).length} membre(s) actif(s) — {company?.name}
      </p>

      {/* Formulaire d'invitation */}
      {isAdmin && (
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-[var(--mase-heading)]">
            Inviter un collègue
          </h2>
          <form onSubmit={handleInvite} className="flex flex-wrap gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              placeholder="email@entreprise.fr"
              className="flex-1 min-w-48 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--mase-primary)]"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--mase-primary)]"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.replace('_', ' ')}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="rounded-full px-5 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--mase-primary)' }}
            >
              {inviting ? 'Envoi…' : '+ Inviter'}
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {successMsg && <p className="mt-2 text-sm text-green-600">{successMsg}</p>}
        </div>
      )}

      {/* Liste des membres */}
      <div className="mt-4 rounded-2xl bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Chargement…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Rôle</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 text-slate-700">{m.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[var(--mase-primary-light)]/20 px-2 py-0.5 text-xs font-medium text-[var(--mase-primary)]">
                      {m.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {m.accepted_at ? '✅ Actif' : '⏳ Invitation en attente'}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      {m.user_id !== session?.user.id && (
                        <button
                          onClick={() => handleRevokeOrRemove(m.id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Retirer
                        </button>
                      )}
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

export default function DashboardTeamPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <TeamContent session={session} />
    </DashboardGuard>
  );
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/pages/DashboardTeamPage.tsx
git commit -m "feat(dashboard): add team management page"
```

---

## Task 11 : Mise à jour du routing — main.tsx

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1 : Ajouter les routes /dashboard/* et passer la session**

La gestion de session est actuellement dans `App.tsx`. Il faut exposer la session au niveau du router. L'approche la plus simple est d'utiliser un `SessionProvider` ou de passer la session via un contexte léger.

Créer d'abord un contexte de session :

```typescript
// src/contexts/SessionContext.ts
import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';

export const SessionContext = createContext<Session | null>(null);
export const useSession = () => useContext(SessionContext);
```

Créer le provider dans main.tsx :

```tsx
// src/main.tsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { SessionContext } from './contexts/SessionContext';
import App from './App';
import HomePage from './pages/HomePage';
import MatricePage from './pages/MatricePage';
import DashboardPage from './pages/DashboardPage';
import DashboardOnboardingPage from './pages/DashboardOnboardingPage';
import DashboardJoinPage from './pages/DashboardJoinPage';
import DashboardTeamPage from './pages/DashboardTeamPage';
import './index.css';

function Root() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={session}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/outil" element={<App />} />
          <Route path="/matrice-polyvalence" element={<MatricePage />} />
          <Route path="/dashboard" element={<DashboardPage session={session} />} />
          <Route path="/dashboard/onboarding" element={<DashboardOnboardingPage session={session} />} />
          <Route path="/dashboard/rejoindre" element={<DashboardJoinPage session={session} />} />
          <Route path="/dashboard/equipe" element={<DashboardTeamPage session={session} />} />
        </Routes>
      </BrowserRouter>
    </SessionContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
```

**Note :** App.tsx gère aussi sa propre session en interne — c'est redondant mais sans impact. On pourrait le refactorer pour utiliser `useSession()` mais ce n'est pas dans le périmètre de cette phase.

- [ ] **Step 2 : Créer le fichier de contexte de session**

```typescript
// src/contexts/SessionContext.ts
import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';

export const SessionContext = createContext<Session | null>(null);
export const useSession = () => useContext(SessionContext);
```

- [ ] **Step 3 : Vérifier que le build TypeScript passe**

```bash
npm run build
```

Résultat attendu : aucune erreur TypeScript.

- [ ] **Step 4 : Commit**

```bash
git add src/main.tsx src/contexts/SessionContext.ts
git commit -m "feat(routing): add dashboard routes with session context"
```

---

## Task 12 : Mise à jour de la HomePage — nouveaux prix + 2 nouvelles cartes

**Files:**
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1 : Mettre à jour les prix et ajouter les nouvelles cartes**

Dans `src/pages/HomePage.tsx`, effectuer les modifications suivantes :

**a) Changer le prix de Politique SSE (ligne ~104) :**
Remplacer `29 €` par `19 €`.

**b) Changer le prix de Matrice de Polyvalence (ligne ~148) :**
Remplacer `29 €` par `19 €`.

**c) Remplacer les cartes "Document Unique" et "Plan de Prévention" par 3 nouvelles cartes :**

Remplacer le bloc `{/* Document Unique — bientôt */}` + `{/* Plan de Prévention — bientôt */}` par :

```tsx
{/* SMI Dashboard — disponible */}
<div
  className="flex flex-col items-center rounded-2xl p-7 text-center transition-all duration-200 hover:-translate-y-1 relative"
  style={{
    background: 'linear-gradient(145deg, #ede9fe, #ddd6fe)',
    border: '2px solid #a78bfa',
    boxShadow: '0 2px 8px rgba(109,40,217,0.12)',
  }}
  onMouseEnter={e =>
    ((e.currentTarget as HTMLDivElement).style.boxShadow =
      '0 8px 20px rgba(109,40,217,0.20)')
  }
  onMouseLeave={e =>
    ((e.currentTarget as HTMLDivElement).style.boxShadow =
      '0 2px 8px rgba(109,40,217,0.12)')
  }
>
  <span
    className="absolute -top-2.5 right-3 rounded-full px-3 py-0.5 text-xs font-bold text-white"
    style={{ backgroundColor: '#7c3aed' }}
  >
    NOUVEAU
  </span>
  <span className="mb-3 text-4xl">🏭</span>
  <span className="mb-1 inline-block rounded-full bg-[#7c3aed] px-3 py-0.5 text-xs font-bold text-white">
    ✓ Disponible
  </span>
  <h2 className="mt-3 text-base font-extrabold text-[var(--mase-heading)]">
    SMI Dashboard
  </h2>
  <p className="mt-1 text-xs text-[var(--mase-muted)]">
    Pilotage QHSE complet · MASE
  </p>
  <div className="mt-4">
    <div>
      <span className="text-xl font-extrabold text-[var(--mase-heading)]">15 €</span>
      <span className="ml-1 text-xs text-[var(--mase-muted)]">/mois</span>
    </div>
    <div className="text-xs text-[var(--mase-muted)]">
      ou <strong>299 €</strong> à vie
    </div>
  </div>
  <Link
    to="/dashboard/acheter"
    className="mt-5 inline-block rounded-full px-7 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
    style={{ backgroundColor: '#7c3aed' }}
  >
    Découvrir →
  </Link>
</div>

{/* Pack MASE Complet */}
<div
  className="flex flex-col items-center rounded-2xl p-7 text-center transition-all duration-200 hover:-translate-y-1 relative"
  style={{
    background: 'linear-gradient(145deg, #fef9c3, #fef08a)',
    border: '2px solid #facc15',
    boxShadow: '0 2px 8px rgba(161,98,7,0.15)',
  }}
  onMouseEnter={e =>
    ((e.currentTarget as HTMLDivElement).style.boxShadow =
      '0 8px 20px rgba(161,98,7,0.22)')
  }
  onMouseLeave={e =>
    ((e.currentTarget as HTMLDivElement).style.boxShadow =
      '0 2px 8px rgba(161,98,7,0.15)')
  }
>
  <span
    className="absolute -top-2.5 right-3 rounded-full px-3 py-0.5 text-xs font-bold text-white"
    style={{ backgroundColor: '#d97706' }}
  >
    ⭐ BEST VALUE
  </span>
  <span className="mb-3 text-4xl">🎁</span>
  <span className="mb-1 inline-block rounded-full bg-[#d97706] px-3 py-0.5 text-xs font-bold text-white">
    ✓ Disponible
  </span>
  <h2 className="mt-3 text-base font-extrabold text-[var(--mase-heading)]">
    Pack MASE Complet
  </h2>
  <p className="mt-1 text-xs text-[var(--mase-muted)]">
    SSE + Matrice + SMI Dashboard
  </p>
  <div className="mt-4">
    <div>
      <span className="text-xl font-extrabold text-[var(--mase-heading)]">25 €</span>
      <span className="ml-1 text-xs text-[var(--mase-muted)]">/mois</span>
    </div>
    <div className="text-xs text-[var(--mase-muted)]">
      ou <strong>399 €</strong> à vie
    </div>
  </div>
  <Link
    to="/dashboard/acheter?pack=complet"
    className="mt-5 inline-block rounded-full px-7 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
    style={{ backgroundColor: '#d97706' }}
  >
    Choisir le pack →
  </Link>
</div>

{/* Document Unique — bientôt */}
<div
  className="flex flex-col items-center rounded-2xl p-7 text-center transition-all duration-200 hover:-translate-y-1"
  style={{
    background: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    opacity: 0.85,
  }}
  onMouseEnter={e => {
    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
    (e.currentTarget as HTMLDivElement).style.opacity = '1';
  }}
  onMouseLeave={e => {
    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
    (e.currentTarget as HTMLDivElement).style.opacity = '0.85';
  }}
>
  <span className="mb-3 text-4xl">📂</span>
  <span className="mb-1 inline-block rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-400">
    Bientôt
  </span>
  <h2 className="mt-3 text-base font-extrabold text-[var(--mase-heading)]">
    Document Unique
  </h2>
  <p className="mt-1 text-xs text-[var(--mase-muted)]">
    Évaluation des risques professionnels
  </p>
  <button
    onClick={() =>
      setModal({ toolName: 'Document Unique', toolSlug: 'document-unique' })
    }
    className="mt-6 rounded-full px-7 py-2.5 text-sm font-bold transition hover:bg-[var(--mase-primary)] hover:text-white"
    style={{
      background: 'white',
      border: '1.5px solid var(--mase-primary)',
      color: 'var(--mase-primary)',
    }}
  >
    🔔 Me notifier
  </button>
</div>
```

**d) Mettre à jour le CSS de la grille** (passer de 4 à 5 colonnes max, ou garder 4 cols et laisser la 5ème aller à la ligne) :

Remplacer `lg:grid-cols-4` par `lg:grid-cols-3 xl:grid-cols-5` dans la div de la grille.

- [ ] **Step 2 : Vérifier visuellement dans le navigateur**

```bash
npm run dev
```

Ouvrir http://localhost:5173 et vérifier :
- Prix Politique SSE et Matrice affichent bien **19 €**
- Carte SMI Dashboard avec badge NOUVEAU et prix 15€/mois · 299€ à vie
- Carte Pack MASE Complet avec badge ⭐ BEST VALUE et prix 25€/mois · 399€ à vie
- Carte Document Unique toujours présente (grisée)

- [ ] **Step 3 : Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat(homepage): update prices to 19€, add SMI Dashboard and Pack Complet cards"
```

---

## Task 13 : Page d'achat du dashboard (/dashboard/acheter)

**Files:**
- Create: `src/pages/DashboardPurchasePage.tsx`
- Modify: `src/main.tsx`

Cette page présente les options de tarification (15€/mois ou 299€ à vie, avec l'option Pack) et lance la Checkout Stripe.

- [ ] **Step 1 : Créer la page d'achat**

```tsx
// src/pages/DashboardPurchasePage.tsx
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthButton } from '../components/AuthButton';

interface Props {
  session: Session | null;
}

type Plan = 'smi-monthly' | 'smi-lifetime' | 'pack-monthly' | 'pack-lifetime';

const PLANS: Record<Plan, { name: string; slug: string; amount: number; mode: 'payment' | 'subscription'; interval?: 'month'; label: string; sublabel: string }> = {
  'smi-monthly': {
    name: 'SMI Dashboard — Mensuel',
    slug: 'smi-dashboard',
    amount: 1500,
    mode: 'subscription',
    interval: 'month',
    label: '15 €/mois',
    sublabel: 'Résiliable à tout moment',
  },
  'smi-lifetime': {
    name: 'SMI Dashboard — À vie',
    slug: 'smi-dashboard',
    amount: 29900,
    mode: 'payment',
    label: '299 €',
    sublabel: 'Accès permanent',
  },
  'pack-monthly': {
    name: 'Pack MASE Complet — Mensuel',
    slug: 'pack-mase-complet',
    amount: 2500,
    mode: 'subscription',
    interval: 'month',
    label: '25 €/mois',
    sublabel: 'SSE + Matrice + SMI Dashboard',
  },
  'pack-lifetime': {
    name: 'Pack MASE Complet — À vie',
    slug: 'pack-mase-complet',
    amount: 39900,
    mode: 'payment',
    label: '399 €',
    sublabel: 'SSE + Matrice + SMI Dashboard — Accès permanent',
  },
};

export default function DashboardPurchasePage({ session }: Props) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isPack = searchParams.get('pack') === 'complet';
  const [selectedPlan, setSelectedPlan] = useState<Plan>(isPack ? 'pack-monthly' : 'smi-monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    // Rediriger si l'utilisateur a déjà une company active
    const check = async () => {
      const { data } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', session.user.id)
        .not('accepted_at', 'is', null)
        .maybeSingle();
      if (data?.company_id) navigate('/dashboard');
    };
    check();
  }, [session, navigate]);

  const handleCheckout = async () => {
    if (!session) return;

    setLoading(true);
    setError(null);

    const plan = PLANS[selectedPlan];

    const { data: { session: authSession } } = await supabase.auth.getSession();
    const token = authSession?.access_token;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          user_id: session.user.id,
          email: session.user.email,
          tool_slug: plan.slug,
          tool_name: plan.name,
          success_path: '/dashboard/onboarding',
          mode: plan.mode,
          unit_amount: plan.amount,
          ...(plan.interval ? { interval: plan.interval } : {}),
        }),
      },
    );

    setLoading(false);

    if (!res.ok) {
      setError('Erreur lors de la redirection vers le paiement. Réessayez.');
      return;
    }

    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const planKeys = isPack
    ? (['pack-monthly', 'pack-lifetime'] as Plan[])
    : (['smi-monthly', 'smi-lifetime', 'pack-monthly', 'pack-lifetime'] as Plan[]);

  return (
    <div className="min-h-screen bg-[#f5f5f3] py-12 px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[var(--mase-heading)]">
            {isPack ? '🎁 Pack MASE Complet' : '🏭 SMI Dashboard QHSE'}
          </h1>
          <p className="mt-2 text-sm text-[var(--mase-muted)]">
            Choisissez votre formule
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {planKeys.map((key) => {
            const plan = PLANS[key];
            const isSelected = selectedPlan === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedPlan(key)}
                className={`rounded-2xl p-6 text-left transition-all ${
                  isSelected
                    ? 'ring-2 ring-[var(--mase-primary)] bg-white shadow-md'
                    : 'bg-white shadow-sm hover:shadow-md'
                }`}
              >
                <div className="text-xl font-extrabold text-[var(--mase-heading)]">
                  {plan.label}
                </div>
                <div className="mt-1 text-xs text-[var(--mase-muted)]">{plan.sublabel}</div>
                <div className="mt-2 text-xs font-medium text-[var(--mase-primary)]">
                  {plan.name}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8">
          {!session ? (
            <div className="text-center">
              <p className="mb-4 text-sm text-slate-600">
                Connectez-vous pour accéder au paiement
              </p>
              <div className="flex justify-center">
                <AuthButton session={session} />
              </div>
            </div>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full rounded-full py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--mase-primary)' }}
            >
              {loading ? 'Redirection…' : `Payer ${PLANS[selectedPlan].label} →`}
            </button>
          )}
          {error && (
            <p className="mt-3 text-center text-sm text-red-600">{error}</p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Paiement sécurisé par Stripe · Facture disponible après paiement
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Ajouter la route dans main.tsx**

Dans `src/main.tsx`, ajouter l'import et la route :

```tsx
import DashboardPurchasePage from './pages/DashboardPurchasePage';
// Dans <Routes> :
<Route path="/dashboard/acheter" element={<DashboardPurchasePage session={session} />} />
```

- [ ] **Step 3 : Vérifier visuellement**

```bash
npm run dev
```

Ouvrir http://localhost:5173/dashboard/acheter et vérifier l'affichage des plans.

- [ ] **Step 4 : Commit**

```bash
git add src/pages/DashboardPurchasePage.tsx src/main.tsx
git commit -m "feat(dashboard): add purchase page with subscription and lifetime options"
```

---

## Task 14 : Vérification finale et build de production

- [ ] **Step 1 : Lancer tous les tests**

```bash
npm test
```

Résultat attendu : tous les tests PASS (au moins `useCompany.test.ts` et `NotifyModal.test.tsx`).

- [ ] **Step 2 : Build de production**

```bash
npm run build
```

Résultat attendu : aucune erreur TypeScript ou de build.

- [ ] **Step 3 : Déployer sur Vercel**

```bash
git push origin main
```

Vercel détecte le push et déploie automatiquement. Vérifier dans le Vercel Dashboard que le déploiement passe.

- [ ] **Step 4 : Test end-to-end sur le site déployé**

Avec le compte `autret.maiwenn@hotmail.fr` :
1. Aller sur https://site-internet-mase.vercel.app
2. Vérifier que les prix SSE et Matrice affichent **19 €**
3. Vérifier les nouvelles cartes SMI Dashboard et Pack Complet
4. Cliquer "Découvrir →" → vérifier la page /dashboard/acheter
5. Se connecter avec Google → sélectionner "SMI Dashboard Mensuel" → cliquer Payer → vérifier la redirection vers Stripe (sans finaliser le paiement)

- [ ] **Step 5 : Commit final de la Phase 1**

```bash
git tag phase1-infrastructure
git push origin --tags
```

---

## Résumé de la Phase 1

À la fin de cette phase, le site dispose de :
- ✅ Tables `companies` et `company_members` avec RLS complète
- ✅ Stripe : support abonnements mensuel + paiement unique lifetime pour SMI Dashboard et Pack Complet
- ✅ Webhook Stripe : création automatique de la company après paiement
- ✅ Edge Function : invitation de collègues par email
- ✅ Routes `/dashboard`, `/dashboard/onboarding`, `/dashboard/rejoindre`, `/dashboard/equipe`, `/dashboard/acheter`
- ✅ Homepage mise à jour : prix 19€ + 2 nouvelles cartes

**Phase 2 à planifier :** port des 6 modules critiques MASE (DUERP, Plan d'actions, Accidents, Habilitations, KPIs Sécurité, Revue de Direction).
