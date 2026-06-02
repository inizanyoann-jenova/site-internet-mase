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
      const stripeCustomerId = typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id ?? null;

      // Idempotency: skip if company already exists for this user+tool
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
        // Cleanup orphan company to allow webhook retry
        await supabase.from('companies').delete().eq('id', company.id);
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
