// src/pages/CartographieLandingPage.tsx
import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { SessionContext } from '../contexts/SessionContext';
import { PAYMENT_SUSPENDED } from '../lib/paymentConfig';

const PRICE_CENTS = 4900; // 49 €

export default function CartographieLandingPage() {
  const session = useContext(SessionContext) as Session | null;
  const navigate = useNavigate();
  const [hasPurchase, setHasPurchase] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    if (!session) { setCheckingAccess(false); return; }
    if (PAYMENT_SUSPENDED) {
      setHasPurchase(true);
      setCheckingAccess(false);
      return;
    }
    supabase
      .from('purchases')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('tool_slug', 'cartographie-processus')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setHasPurchase(!!data);
        setCheckingAccess(false);
      });
  }, [session]);

  const handleBuy = async () => {
    if (!session) {
      await supabase.auth.signInWithOAuth({ provider: 'google' });
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          user_id: session.user.id,
          email: session.user.email,
          tool_slug: 'cartographie-processus',
          tool_name: 'Cartographie des Processus MASE',
          mode: 'payment',
          unit_amount: PRICE_CENTS,
          success_path: '/cartographie?payment=success',
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = () => {
    navigate('/cartographie/wizard');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f3' }}>
      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-3"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        <a href="/" className="text-lg font-bold text-white">MASE</a>
        {session ? (
          <span className="text-sm text-white/70">{session.user.email}</span>
        ) : (
          <button
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
            className="text-sm text-white/70 hover:text-white"
          >
            Se connecter
          </button>
        )}
      </nav>

      {/* Hero */}
      <section
        className="px-6 py-20 text-center"
        style={{ background: 'linear-gradient(135deg, var(--mase-primary), #1e4d7b)' }}
      >
        <span
          className="mb-4 inline-block rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          🗺️ Conforme MASE V2024
        </span>
        <h1 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">
          Cartographie des Processus
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
          Créez votre cartographie des processus et vos fiches de processus conformes MASE V2024,
          guidé étape par étape — même sans connaissance préalable.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          {!checkingAccess && (
            hasPurchase ? (
              <button
                onClick={handleStart}
                className="rounded-lg px-8 py-3 text-base font-bold text-white"
                style={{ backgroundColor: '#16a34a' }}
              >
                Accéder à mon outil →
              </button>
            ) : (
              <button
                onClick={handleBuy}
                disabled={isLoading}
                className="rounded-lg px-8 py-3 text-base font-bold text-white disabled:opacity-60"
                style={{ backgroundColor: '#16a34a' }}
              >
                {isLoading ? 'Redirection…' : 'Acheter — 49 € (paiement unique)'}
              </button>
            )
          )}
          <p className="text-sm text-white/60">Accès à vie · Sauvegarde en ligne · 3 PDF générés</p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="mb-10 text-center text-2xl font-bold text-gray-800">Ce que vous obtenez</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: '🗺️',
              title: 'Cartographie visuelle PDF',
              desc: "Format standard MASE (client gauche/droite, pilotage/réalisation/support) prête pour l'auditeur.",
            },
            {
              icon: '📄',
              title: 'Fiches de processus',
              desc: 'Une fiche détaillée par processus : pilote, objectif SMART, KPIs, risques — conformes aux 5 axes MASE.',
            },
            {
              icon: '✨',
              title: 'IA intégrée',
              desc: "L'IA recherche votre entreprise en ligne et pré-remplit la cartographie. Objectifs SMART reformulés automatiquement.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="mb-2 font-bold text-gray-800">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
