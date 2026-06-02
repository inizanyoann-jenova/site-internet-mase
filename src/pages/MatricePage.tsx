// src/pages/MatricePage.tsx
import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AccessGate } from '../components/AccessGate';
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
  const [showGate, setShowGate] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) checkPurchase(s.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) checkPurchase(s.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function checkPurchase(userId: string) {
    setLoading(true);
    const { data } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('tool_slug', 'matrice-polyvalence')
      .maybeSingle();
    setHasPurchase(!!data);
    setLoading(false);
  }

  // Retour Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'success') return;
    window.history.replaceState({}, '', '/matrice-polyvalence');
    let count = 0;
    const interval = setInterval(() => {
      if (session) checkPurchase(session.user.id);
      if (++count >= 5) clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
  }, [session]);

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
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-8"
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
          <button
            onClick={() => setShowGate(true)}
            className="mt-6 w-full rounded-full bg-[var(--mase-primary)] py-3 text-sm font-semibold text-white hover:opacity-90 transition"
          >
            Accéder pour 29 €
          </button>
        </div>
        {showGate && (
          <AccessGate session={session} onClose={() => setShowGate(false)} />
        )}
      </div>
    );
  }

  return (
    <MatriceProvider session={session}>
      <MatriceApp />
    </MatriceProvider>
  );
}
