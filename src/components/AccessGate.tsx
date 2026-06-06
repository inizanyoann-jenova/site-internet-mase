import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { redirectToCheckout } from '../lib/stripe';
import { PAYMENT_SUSPENDED } from '../lib/paymentConfig';

interface Props {
  session: Session | null;
  onClose: () => void;
}

export function AccessGate({ session, onClose }: Props) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (PAYMENT_SUSPENDED && session) onClose();
  }, [session, onClose]);

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
