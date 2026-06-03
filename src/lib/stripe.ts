import { supabase } from './supabase';

export async function redirectToCheckout(
  userId: string,
  email: string,
  toolSlug = 'politique-sse',
  toolName = 'Générateur Politique SSE — MASE',
  successPath = '/outil',
  mode: 'payment' | 'subscription' = 'payment',
  unitAmount = 2900,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      user_id: userId,
      email,
      tool_slug: toolSlug,
      tool_name: toolName,
      success_path: successPath,
      mode,
      unit_amount: unitAmount,
    },
  });

  if (error) {
    throw new Error(error.message ?? 'Impossible de créer la session de paiement');
  }

  if (!data?.url || typeof data.url !== 'string') {
    throw new Error('URL de paiement invalide reçue');
  }

  window.location.href = data.url;
}
