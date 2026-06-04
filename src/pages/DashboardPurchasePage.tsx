// src/pages/DashboardPurchasePage.tsx
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthButton } from '../components/AuthButton';

interface Props {
  session: Session | null;
}

type Plan = 'smi-monthly' | 'smi-lifetime' | 'pack-monthly' | 'pack-lifetime';

const PLANS: Record<Plan, {
  name: string;
  slug: string;
  amount: number;
  mode: 'payment' | 'subscription';
  interval?: 'month';
  label: string;
  sublabel: string;
}> = {
  'smi-monthly': {
    name: 'SMI Dashboard — Mensuel',
    slug: 'smi-dashboard',
    amount: 1500,
    mode: 'subscription',
    interval: 'month',
    label: '15 €/mois',
    sublabel: 'Résiliable à tout moment',
  },
  'smi-lifetime': {
    name: 'SMI Dashboard — À vie',
    slug: 'smi-dashboard',
    amount: 29900,
    mode: 'payment',
    label: '299 €',
    sublabel: 'Accès permanent',
  },
  'pack-monthly': {
    name: 'Pack MASE Complet — Mensuel',
    slug: 'pack-mase-complet',
    amount: 2500,
    mode: 'subscription',
    interval: 'month',
    label: '25 €/mois',
    sublabel: 'SSE + Matrice + SMI Dashboard',
  },
  'pack-lifetime': {
    name: 'Pack MASE Complet — À vie',
    slug: 'pack-mase-complet',
    amount: 39900,
    mode: 'payment',
    label: '399 €',
    sublabel: 'SSE + Matrice + SMI Dashboard — Accès permanent',
  },
};

const validPlans = Object.keys(PLANS) as Plan[];

export default function DashboardPurchasePage({ session }: Props) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isPack = searchParams.get('pack') === 'complet';
  const planParam = searchParams.get('plan') as Plan | null;
  const initialPlan: Plan =
    planParam && validPlans.includes(planParam)
      ? planParam
      : isPack
      ? 'pack-monthly'
      : 'smi-monthly';
  const [selectedPlan, setSelectedPlan] = useState<Plan>(initialPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    // Redirect if user already has an active company
    const check = async () => {
      const { data } = await supabase.rpc('get_my_dashboard_access');
      if (data?.company_id) navigate('/dashboard');
    };
    check();
  }, [session, navigate]);

  const handleCheckout = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);

    const plan = PLANS[selectedPlan];
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const token = authSession?.access_token;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          user_id: session.user.id,
          email: session.user.email,
          tool_slug: plan.slug,
          tool_name: plan.name,
          success_path: '/dashboard/onboarding',
          mode: plan.mode,
          unit_amount: plan.amount,
          ...(plan.interval ? { interval: plan.interval } : {}),
        }),
      },
    );

    setLoading(false);

    if (!res.ok) {
      setError('Erreur lors de la redirection vers le paiement. Réessayez.');
      return;
    }

    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const planKeys: Plan[] = isPack
    ? ['pack-monthly', 'pack-lifetime']
    : ['smi-monthly', 'smi-lifetime', 'pack-monthly', 'pack-lifetime'];

  return (
    <div className="min-h-screen bg-[#f5f5f3] py-12 px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[var(--mase-heading)]">
            {isPack ? '🎁 Pack MASE Complet' : '🏭 SMI Dashboard QHSE'}
          </h1>
          <p className="mt-2 text-sm text-[var(--mase-muted)]">
            Choisissez votre formule
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {planKeys.map((key) => {
            const plan = PLANS[key];
            const isSelected = selectedPlan === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedPlan(key)}
                className={`rounded-2xl p-6 text-left transition-all ${
                  isSelected
                    ? 'ring-2 ring-[var(--mase-primary)] bg-white shadow-md'
                    : 'bg-white shadow-sm hover:shadow-md'
                }`}
              >
                <div className="text-xl font-extrabold text-[var(--mase-heading)]">
                  {plan.label}
                </div>
                <div className="mt-1 text-xs text-[var(--mase-muted)]">{plan.sublabel}</div>
                <div className="mt-2 text-xs font-medium text-[var(--mase-primary)]">
                  {plan.name}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8">
          {!session ? (
            <div className="text-center">
              <p className="mb-4 text-sm text-slate-600">
                Connectez-vous pour accéder au paiement
              </p>
              <div className="flex justify-center">
                <AuthButton session={session} />
              </div>
            </div>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full rounded-full py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--mase-primary)' }}
            >
              {loading ? 'Redirection…' : `Payer ${PLANS[selectedPlan].label} →`}
            </button>
          )}
          {error && (
            <p className="mt-3 text-center text-sm text-red-600">{error}</p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Paiement sécurisé par Stripe · Facture disponible après paiement
        </p>
      </div>
    </div>
  );
}
