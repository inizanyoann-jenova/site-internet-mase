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
