# Emails transactionnels — Invitations équipe + Confirmation paiement

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Intégrer Resend pour envoyer automatiquement les emails d'invitation d'équipe et de confirmation post-paiement Stripe.

**Architecture:** Module partagé `_shared/resend.ts` exposant `sendEmail()`, appelé par `invite-company-member` et `stripe-webhook`. Envoi non-bloquant (try/catch silencieux). Deux secrets Supabase à configurer : `RESEND_API_KEY` et `RESEND_FROM`.

**Tech Stack:** Deno (Supabase Edge Functions), Resend API v1 (HTTP), Vitest + React Testing Library (tests UI)

---

## Fichiers modifiés / créés

| Fichier | Action |
|---------|--------|
| `supabase/functions/_shared/resend.ts` | CRÉER — helper `sendEmail()` |
| `supabase/functions/invite-company-member/index.ts` | MODIFIER — envoyer email après invitation |
| `supabase/functions/stripe-webhook/index.ts` | MODIFIER — envoyer email après paiement |
| `src/pages/DashboardTeamPage.tsx` | MODIFIER — masquer l'URL brute dans le message succès |

---

## Task 1 : Configurer les secrets Resend dans Supabase

**Prérequis :** Créer un compte sur [resend.com](https://resend.com), générer une clé API, et vérifier un domaine expéditeur (ou utiliser `onboarding@resend.dev` pour les tests).

**Files:**
- Aucun fichier de code — configuration via Supabase CLI

- [ ] **Step 1 : Créer un compte Resend et générer la clé API**

  1. Aller sur [resend.com](https://resend.com) → Sign up
  2. Dashboard → API Keys → Create API Key
  3. Nommer la clé `mase-dashboard-prod`, permission `Sending access`
  4. Copier la clé (`re_xxxxx`)

- [ ] **Step 2 : Ajouter les secrets via Supabase CLI**

  ```bash
  npx supabase secrets set RESEND_API_KEY=re_xxxxx --project-ref ulceeurwibmbtnqhkaao
  npx supabase secrets set RESEND_FROM="MASE Dashboard <onboarding@resend.dev>" --project-ref ulceeurwibmbtnqhkaao
  ```

  > Remplacer `re_xxxxx` par ta vraie clé. Pour les tests, garder `onboarding@resend.dev` comme expéditeur (domaine pré-vérifié Resend). En production, remplacer par `noreply@ton-domaine.fr` après vérification DNS.

- [ ] **Step 3 : Vérifier que les secrets sont bien enregistrés**

  ```bash
  npx supabase secrets list --project-ref ulceeurwibmbtnqhkaao
  ```

  Expected : ligne `RESEND_API_KEY` et `RESEND_FROM` dans la liste.

---

## Task 2 : Créer `_shared/resend.ts`

**Files:**
- Create: `supabase/functions/_shared/resend.ts`

- [ ] **Step 1 : Créer le fichier**

  ```typescript
  // supabase/functions/_shared/resend.ts
  export async function sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      console.warn('[resend] RESEND_API_KEY manquant — email non envoyé');
      return;
    }
    const from = Deno.env.get('RESEND_FROM') ?? 'MASE Dashboard <onboarding@resend.dev>';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend error ${res.status}: ${body}`);
    }
  }
  ```

- [ ] **Step 2 : Commit**

  ```bash
  git add supabase/functions/_shared/resend.ts
  git commit -m "feat: module partagé sendEmail() via Resend API"
  ```

---

## Task 3 : Modifier `invite-company-member` — email d'invitation

**Files:**
- Modify: `supabase/functions/invite-company-member/index.ts`

- [ ] **Step 1 : Remplacer le contenu complet du fichier**

  ```typescript
  // supabase/functions/invite-company-member/index.ts
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
  import { sendEmail } from '../_shared/resend.ts';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  function buildInvitationEmail(companyName: string, role: string, inviteUrl: string): string {
    return `<!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"></head>
  <body style="font-family:-apple-system,sans-serif;background:#f5f5f3;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:24px;font-weight:800;color:#1B4F8A;">MASE Dashboard</span>
    </div>
    <h1 style="font-size:20px;color:#1a1a1a;margin:0 0 12px;">Vous avez été invité à rejoindre une équipe</h1>
    <p style="color:#64748b;font-size:15px;line-height:1.6;">
      Vous avez été invité à rejoindre l'équipe <strong style="color:#1a1a1a;">${companyName}</strong>
      en tant que <strong style="color:#1a1a1a;">${role.replace(/_/g, ' ')}</strong>.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${inviteUrl}"
         style="background:#1B4F8A;color:white;padding:14px 28px;border-radius:50px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        Rejoindre l'équipe
      </a>
    </div>
    <p style="color:#94a3b8;font-size:13px;text-align:center;margin-top:24px;">
      Ce lien est à usage unique. S'il ne fonctionne pas, demandez une nouvelle invitation à votre administrateur.
    </p>
  </div>
  </body>
  </html>`;
  }

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

    const VALID_ROLES = ['admin', 'responsable_qhse', 'direction', 'lecteur', 'operateur'];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!body.company_id || !body.email || !body.role) {
      return new Response(JSON.stringify({ error: 'Champs manquants: company_id, email, role requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!emailRegex.test(body.email.trim())) {
      return new Response(JSON.stringify({ error: 'Adresse email invalide' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!VALID_ROLES.includes(body.role)) {
      return new Response(JSON.stringify({ error: `Rôle invalide. Valeurs acceptées: ${VALID_ROLES.join(', ')}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    body.email = body.email.trim();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

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

    // Récupérer le nom de la company pour l'email
    const { data: companyData } = await supabase
      .from('companies')
      .select('name')
      .eq('id', body.company_id)
      .maybeSingle();
    const companyName = companyData?.name ?? 'votre équipe';

    const appUrl = Deno.env.get('APP_URL')!;

    const { data: existingInvite } = await supabase
      .from('company_members')
      .select('id, invitation_token')
      .eq('company_id', body.company_id)
      .eq('email', body.email)
      .is('accepted_at', null)
      .maybeSingle();

    if (existingInvite) {
      const existingUrl = `${appUrl}/dashboard/rejoindre?token=${existingInvite.invitation_token}`;
      try {
        await sendEmail(
          body.email,
          `Vous avez été invité à rejoindre ${companyName} sur MASE Dashboard`,
          buildInvitationEmail(companyName, body.role, existingUrl),
        );
      } catch (e) {
        console.error('[invite] Erreur envoi email (invitation existante):', e);
      }
      return new Response(JSON.stringify({ success: true, invite_url: existingUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const inviteUrl = `${appUrl}/dashboard/rejoindre?token=${invitationToken}`;

    try {
      await sendEmail(
        body.email,
        `Vous avez été invité à rejoindre ${companyName} sur MASE Dashboard`,
        buildInvitationEmail(companyName, body.role, inviteUrl),
      );
    } catch (e) {
      console.error('[invite] Erreur envoi email:', e);
    }

    return new Response(JSON.stringify({ success: true, invite_url: inviteUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  });
  ```

- [ ] **Step 2 : Déployer la fonction**

  ```bash
  npx supabase functions deploy invite-company-member --project-ref ulceeurwibmbtnqhkaao
  ```

  Expected output : `Deployed Function invite-company-member`

- [ ] **Step 3 : Vérifier dans les logs Supabase**

  Aller sur Supabase Dashboard → Edge Functions → `invite-company-member` → Logs.  
  Inviter un email test depuis `/dashboard/equipe`. Vérifier :
  - Pas d'erreur dans les logs
  - L'email reçu dans la boîte du destinataire contient le bouton "Rejoindre l'équipe"

- [ ] **Step 4 : Commit**

  ```bash
  git add supabase/functions/invite-company-member/index.ts
  git commit -m "feat(invite): envoyer email d'invitation via Resend"
  ```

---

## Task 4 : Modifier `stripe-webhook` — email de confirmation post-paiement

**Files:**
- Modify: `supabase/functions/stripe-webhook/index.ts`

- [ ] **Step 1 : Remplacer le contenu complet du fichier**

  ```typescript
  import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
  import { sendEmail } from '../_shared/resend.ts';

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  });

  const DASHBOARD_SLUGS = ['smi-dashboard', 'pack-mase-complet'];

  const TOOL_NAMES: Record<string, string> = {
    'smi-dashboard': 'SMI Dashboard QHSE',
    'pack-mase-complet': 'Pack MASE Complet',
    'politique-sse': 'Générateur de Politique SSE',
    'matrice-polyvalence': 'Matrice de Polyvalence',
  };

  const TOOL_URLS: Record<string, string> = {
    'politique-sse': '/outil',
    'matrice-polyvalence': '/matrice-polyvalence',
  };

  function formatAmount(cents: number): string {
    return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
  }

  function buildDashboardConfirmationEmail(
    toolName: string,
    amount: string,
    subscriptionType: string,
    appUrl: string,
  ): string {
    return `<!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"></head>
  <body style="font-family:-apple-system,sans-serif;background:#f5f5f3;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:24px;font-weight:800;color:#1B4F8A;">MASE Dashboard</span>
    </div>
    <h1 style="font-size:20px;color:#1a1a1a;margin:0 0 12px;">Bienvenue ! Votre accès est activé</h1>
    <p style="color:#64748b;font-size:15px;line-height:1.6;">Merci pour votre achat. Voici le récapitulatif :</p>
    <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:20px 0;">
      <table style="width:100%;font-size:14px;border-collapse:collapse;">
        <tr><td style="color:#64748b;padding:6px 0;">Produit</td><td style="font-weight:600;color:#1a1a1a;text-align:right;">${toolName}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0;">Montant</td><td style="font-weight:600;color:#1a1a1a;text-align:right;">${amount}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0;">Type</td><td style="font-weight:600;color:#1a1a1a;text-align:right;">${subscriptionType}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:32px 0;">
      <a href="${appUrl}/dashboard/onboarding"
         style="background:#1B4F8A;color:white;padding:14px 28px;border-radius:50px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        Configurer mon dashboard
      </a>
    </div>
    <div style="border-left:3px solid #1B4F8A;padding:12px 16px;margin:24px 0;background:#f0f4ff;border-radius:0 8px 8px 0;">
      <p style="color:#1B4F8A;font-weight:600;margin:0 0 8px;font-size:14px;">Étapes suivantes</p>
      <ol style="color:#475569;font-size:13px;margin:0;padding-left:20px;line-height:2;">
        <li>Nommez votre entreprise</li>
        <li>Invitez votre équipe</li>
        <li>Commencez à remplir vos données QHSE</li>
      </ol>
    </div>
    <p style="color:#94a3b8;font-size:13px;text-align:center;">
      Des questions ? <a href="mailto:inizan.yoann@gmail.com" style="color:#1B4F8A;">inizan.yoann@gmail.com</a>
    </p>
  </div>
  </body>
  </html>`;
  }

  function buildToolConfirmationEmail(
    toolName: string,
    amount: string,
    toolUrl: string,
  ): string {
    return `<!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"></head>
  <body style="font-family:-apple-system,sans-serif;background:#f5f5f3;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:24px;font-weight:800;color:#1B4F8A;">MASE</span>
    </div>
    <h1 style="font-size:20px;color:#1a1a1a;margin:0 0 12px;">Votre accès est confirmé</h1>
    <p style="color:#64748b;font-size:15px;line-height:1.6;">Merci pour votre achat. Voici le récapitulatif :</p>
    <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:20px 0;">
      <table style="width:100%;font-size:14px;border-collapse:collapse;">
        <tr><td style="color:#64748b;padding:6px 0;">Produit</td><td style="font-weight:600;color:#1a1a1a;text-align:right;">${toolName}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0;">Montant</td><td style="font-weight:600;color:#1a1a1a;text-align:right;">${amount}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:32px 0;">
      <a href="${toolUrl}"
         style="background:#1B4F8A;color:white;padding:14px 28px;border-radius:50px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        Accéder à l'outil
      </a>
    </div>
    <p style="color:#94a3b8;font-size:13px;text-align:center;">
      Des questions ? <a href="mailto:inizan.yoann@gmail.com" style="color:#1B4F8A;">inizan.yoann@gmail.com</a>
    </p>
  </div>
  </body>
  </html>`;
  }

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

    const appUrl = Deno.env.get('APP_URL') ?? 'https://mase-outil.fr';

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const toolSlug = session.metadata?.tool_slug ?? 'politique-sse';

      if (!userId) {
        console.error('user_id manquant dans les metadata Stripe');
        return new Response('user_id manquant', { status: 400 });
      }

      // Récupérer l'email utilisateur (commun aux deux branches)
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const userEmail = userData?.user?.email ?? '';

      if (DASHBOARD_SLUGS.includes(toolSlug)) {
        const subscriptionStatus = session.mode === 'subscription' ? 'active' : 'lifetime';
        const stripeCustomerId = typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id ?? null;

        const { data: existing } = await supabase
          .from('companies')
          .select('id')
          .eq('admin_user_id', userId)
          .eq('tool_slug', toolSlug)
          .maybeSingle();

        if (existing) {
          console.log('Company already exists, skipping creation:', existing.id);
          return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const { data: company, error: companyErr } = await supabase
          .from('companies')
          .insert({
            admin_user_id: userId,
            stripe_customer_id: stripeCustomerId,
            subscription_status: subscriptionStatus,
            tool_slug: toolSlug,
            name: 'Mon entreprise',
          })
          .select('id')
          .single();

        if (companyErr) {
          console.error('Erreur création company:', companyErr.message);
          return new Response('Erreur base de données', { status: 500 });
        }

        const { error: memberErr } = await supabase
          .from('company_members')
          .insert({
            company_id: company.id,
            user_id: userId,
            email: userEmail,
            role: 'admin',
            accepted_at: new Date().toISOString(),
          });

        if (memberErr) {
          console.error('Erreur création membre admin:', memberErr.message);
          await supabase.from('companies').delete().eq('id', company.id);
          return new Response('Erreur base de données', { status: 500 });
        }

        // Envoyer email de confirmation dashboard
        if (userEmail) {
          const toolName = TOOL_NAMES[toolSlug] ?? toolSlug;
          const amount = formatAmount(session.amount_total ?? 0);
          const subscriptionType = session.mode === 'subscription' ? 'Abonnement mensuel' : 'Accès à vie';
          try {
            await sendEmail(
              userEmail,
              'Bienvenue sur MASE Dashboard — votre accès est activé',
              buildDashboardConfirmationEmail(toolName, amount, subscriptionType, appUrl),
            );
          } catch (e) {
            console.error('[stripe-webhook] Erreur envoi email confirmation dashboard:', e);
          }
        }
      } else {
        // Outils one-shot (politique-sse, matrice-polyvalence)
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

        // Envoyer email de confirmation outil one-shot
        if (userEmail) {
          const toolName = TOOL_NAMES[toolSlug] ?? toolSlug;
          const amount = formatAmount(session.amount_total);
          const toolPath = TOOL_URLS[toolSlug] ?? '/';
          const toolUrl = `${appUrl}${toolPath}`;
          try {
            await sendEmail(
              userEmail,
              `Votre accès à ${toolName} est confirmé`,
              buildToolConfirmationEmail(toolName, amount, toolUrl),
            );
          } catch (e) {
            console.error('[stripe-webhook] Erreur envoi email confirmation outil:', e);
          }
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

      const { error: updateErr } = await supabase
        .from('companies')
        .update({ subscription_status: 'canceled' })
        .eq('stripe_customer_id', customerId);

      if (updateErr) {
        console.error('Erreur mise à jour statut company:', updateErr.message);
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

      const STATUS_MAP: Record<string, string> = {
        active: 'active',
        past_due: 'past_due',
        canceled: 'canceled',
        unpaid: 'canceled',
        incomplete_expired: 'canceled',
        trialing: 'active',
        incomplete: 'pending',
        paused: 'pending',
      };
      const status = STATUS_MAP[subscription.status] ?? 'pending';

      const { error: updateErr } = await supabase
        .from('companies')
        .update({ subscription_status: status })
        .eq('stripe_customer_id', customerId);

      if (updateErr) {
        console.error('Erreur mise à jour statut company:', updateErr.message);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
  ```

- [ ] **Step 2 : Déployer la fonction**

  ```bash
  npx supabase functions deploy stripe-webhook --project-ref ulceeurwibmbtnqhkaao
  ```

  Expected output : `Deployed Function stripe-webhook`

- [ ] **Step 3 : Vérifier dans les logs Supabase**

  Supabase Dashboard → Edge Functions → `stripe-webhook` → Logs.  
  Déclencher un achat test Stripe (avec carte test `4242 4242 4242 4242`). Vérifier :
  - Pas d'erreur dans les logs
  - L'email de confirmation arrive dans la boîte du compte test

- [ ] **Step 4 : Commit**

  ```bash
  git add supabase/functions/stripe-webhook/index.ts
  git commit -m "feat(webhook): envoyer email de confirmation post-paiement via Resend"
  ```

---

## Task 5 : Corriger l'UI `DashboardTeamPage` — masquer l'URL brute

**Files:**
- Modify: `src/pages/DashboardTeamPage.tsx`

- [ ] **Step 1 : Écrire le test qui vérifie le comportement attendu**

  Créer `src/pages/DashboardTeamPage.test.tsx` :

  ```typescript
  import { render, screen, fireEvent, waitFor } from '@testing-library/react';
  import { vi, describe, it, expect, beforeEach } from 'vitest';
  import DashboardTeamPage from './DashboardTeamPage';

  // Mock supabase
  vi.mock('../lib/supabase', () => ({
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: 'test-token' } },
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [] }),
      })),
    },
  }));

  // Mock useCompany
  vi.mock('../hooks/useCompany', () => ({
    useCompany: () => ({
      company: { id: 'company-1', name: 'ACME' },
      membership: { role: 'admin' },
    }),
  }));

  const fakeSession = {
    user: { id: 'user-1', email: 'admin@test.fr' },
    access_token: 'test-token',
  } as any;

  describe('DashboardTeamPage — message succès invitation', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, invite_url: 'https://app.fr/dashboard/rejoindre?token=abc123' }),
      });
    });

    it("affiche 'Invitation envoyée par email' sans l'URL brute", async () => {
      render(<DashboardTeamPage session={fakeSession} />);

      fireEvent.change(screen.getByPlaceholderText('email@entreprise.fr'), {
        target: { value: 'nouveau@test.fr' },
      });
      fireEvent.click(screen.getByText('+ Inviter'));

      await waitFor(() => {
        expect(screen.getByText(/Invitation envoyée par email à nouveau@test\.fr/)).toBeInTheDocument();
      });

      expect(screen.queryByText(/dashboard\/rejoindre/)).not.toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

  ```bash
  npx vitest run src/pages/DashboardTeamPage.test.tsx
  ```

  Expected : FAIL — le message affiché contient encore l'URL brute.

- [ ] **Step 3 : Modifier `DashboardTeamPage.tsx` — lignes 85-86**

  Fichier : `src/pages/DashboardTeamPage.tsx`, lignes 85-86.

  Remplacer :
  ```typescript
  const result = await res.json();
  setSuccessMsg(`Invitation envoyée à ${inviteEmail}. Lien : ${result.invite_url}`);
  ```

  Par :
  ```typescript
  await res.json();
  setSuccessMsg(`Invitation envoyée par email à ${inviteEmail}.`);
  ```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

  ```bash
  npx vitest run src/pages/DashboardTeamPage.test.tsx
  ```

  Expected : PASS

- [ ] **Step 5 : Lancer la suite complète de tests**

  ```bash
  npx vitest run
  ```

  Expected : tous les tests passent.

- [ ] **Step 6 : Commit**

  ```bash
  git add src/pages/DashboardTeamPage.tsx src/pages/DashboardTeamPage.test.tsx
  git commit -m "fix(equipe): masquer l'URL brute dans le message de succès après invitation"
  ```

---

## Task 6 : Vérification finale end-to-end

- [ ] **Step 1 : Tester le flux invitation complet**

  1. Se connecter sur `/dashboard/equipe` en tant qu'admin
  2. Inviter une adresse email test
  3. Vérifier : message "Invitation envoyée par email à ..." affiché (sans URL)
  4. Vérifier : email reçu dans la boîte du destinataire avec le bouton "Rejoindre l'équipe"
  5. Cliquer sur le lien → redirection vers `/dashboard/rejoindre?token=...`
  6. Se connecter avec le bon compte → message "Invitation acceptée !" → redirection `/dashboard`

- [ ] **Step 2 : Vérifier les logs Supabase**

  Supabase Dashboard → Edge Functions → `invite-company-member` → Logs.  
  Aucune erreur `[invite] Erreur envoi email`.

- [ ] **Step 3 : Commit final si modifications supplémentaires**

  ```bash
  git add -p
  git commit -m "chore: ajustements post-vérification emails transactionnels"
  ```
