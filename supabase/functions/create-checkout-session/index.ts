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
