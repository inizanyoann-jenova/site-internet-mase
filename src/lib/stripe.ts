import { supabase } from './supabase';

export async function redirectToCheckout(userId: string, email: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { user_id: userId, email },
  });

  if (error) {
    throw new Error(error.message ?? 'Impossible de créer la session de paiement');
  }

  if (!data?.url || typeof data.url !== 'string') {
    throw new Error('URL de paiement invalide reçue');
  }

  window.location.href = data.url;
}
