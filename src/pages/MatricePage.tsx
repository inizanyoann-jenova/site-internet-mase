// src/pages/MatricePage.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { redirectToCheckout } from '../lib/stripe';
import { MatriceProvider } from '../components/matrice/MatriceContext';
import { MatriceHeader } from '../components/matrice/MatriceHeader';
import { MatriceTabs } from '../components/matrice/MatriceTabs';
import { MatriceView } from '../components/matrice/views/MatriceView';
import { CollaborateursView } from '../components/matrice/views/CollaborateursView';
import { AbsencesView } from '../components/matrice/views/AbsencesView';
import { CompetencesView } from '../components/matrice/views/CompetencesView';
import { CategoriesView } from '../components/matrice/views/CategoriesView';
import { ParametresView } from '../components/matrice/views/ParametresView';
import { useMatrice } from '../components/matrice/MatriceContext';

function MatriceApp() {
  const { activeTab } = useMatrice();
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#eef2f7' }}>
      <MatriceHeader />
      <MatriceTabs />
      <main className="mx-auto w-full max-w-[1500px] flex-1 p-5">
        {activeTab === 'matrice'        && <MatriceView />}
        {activeTab === 'collaborateurs' && <CollaborateursView />}
        {activeTab === 'absences'       && <AbsencesView />}
        {activeTab === 'competences'    && <CompetencesView />}
        {activeTab === 'categories'     && <CategoriesView />}
        {activeTab === 'parametres'     && <ParametresView />}
      </main>
    </div>
  );
}

export default function MatricePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [hasPurchase, setHasPurchase] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const checkInflight = useRef(false);
  const isPolling = useRef(false);

  const checkPurchase = useCallback(async (userId: string) => {
    if (checkInflight.current) return;
    checkInflight.current = true;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('tool_slug', 'matrice-polyvalence')
        .maybeSingle();
      setHasPurchase(!!data);
    } finally {
      checkInflight.current = false;
      setLoading(false);
    }
  }, []);

  // Auth setup
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        if (s) checkPurchase(s.user.id);
        else setLoading(false);
      })
      .catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) checkPurchase(s.user.id);
    });
    return () => subscription.unsubscribe();
  }, [checkPurchase]);

  // Stripe return — clean URL once on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      window.history.replaceState({}, '', '/matrice-polyvalence');
      isPolling.current = true;
    }
  }, []);

  // Polling — start when session available and we're in polling mode
  useEffect(() => {
    if (!isPolling.current || !session || hasPurchase) return;
    let count = 0;
    const interval = setInterval(() => {
      checkPurchase(session.user.id);
      if (++count >= 5) {
        clearInterval(interval);
        isPolling.current = false;
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [session, hasPurchase, checkPurchase]);

  // Stop polling once purchase confirmed
  useEffect(() => {
    if (hasPurchase) isPolling.current = false;
  }, [hasPurchase]);

  async function handleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/matrice-polyvalence' },
    });
  }

  async function handlePurchase() {
    if (!session) return;
    setIsRedirecting(true);
    setCheckoutError(null);
    try {
      await redirectToCheckout(
        session.user.id,
        session.user.email ?? '',
        'matrice-polyvalence',
        'Matrice de Polyvalence — MASE',
        '/matrice-polyvalence',
      );
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Erreur inconnue');
      setIsRedirecting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-slate-400">Chargement…</div>
      </div>
    );
  }

  if (!session || !hasPurchase) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center p-8"
        style={{ backgroundColor: '#eef2f7' }}
      >
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <div className="text-4xl mb-4">📊</div>
          <h1 className="text-xl font-bold text-slate-800">Matrice de Polyvalence</h1>
          <p className="mt-2 text-sm text-slate-500">
            Gérez les compétences et la polyvalence de vos équipes — conforme MASE.
          </p>
          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <p className="text-lg font-bold text-[var(--mase-primary)]">29 € — accès à vie</p>
            <p className="mt-1 text-xs text-slate-400">Paiement unique, sans abonnement.</p>
          </div>
          {checkoutError && (
            <p className="mt-3 text-sm text-red-600">{checkoutError}</p>
          )}
          {!session ? (
            <button
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
          ) : (
            <button
              onClick={handlePurchase}
              disabled={isRedirecting}
              className="mt-6 w-full rounded-full bg-[var(--mase-primary)] py-3 text-sm font-semibold text-white hover:opacity-90 transition disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isRedirecting ? 'Redirection vers le paiement…' : 'Accéder pour 29 €'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <MatriceProvider session={session}>
      <MatriceApp />
    </MatriceProvider>
  );
}
