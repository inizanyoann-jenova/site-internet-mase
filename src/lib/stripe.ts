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
