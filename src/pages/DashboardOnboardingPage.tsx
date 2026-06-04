// src/pages/DashboardOnboardingPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Props {
  session: Session | null;
}

export default function DashboardOnboardingPage({ session }: Props) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [siret, setSiret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    if (!session) {
      navigate('/');
      return;
    }

    const check = async () => {
      const { data, error: queryErr } = await supabase.rpc('get_my_dashboard_access');

      if (queryErr) {
        console.error('Erreur vérification accès:', queryErr.message);
        setCheckingAccess(false);
        return;
      }

      if (data?.company_id) {
        setCompanyId(data.company_id);
        if (data.company_name && data.company_name !== 'Mon entreprise') {
          navigate('/dashboard');
          return;
        }
      }
      setCheckingAccess(false);
    };

    check();
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !companyId) return;

    setLoading(true);
    setError(null);

    const { error: updateErr } = await supabase
      .from('companies')
      .update({ name: name.trim() })
      .eq('id', companyId);

    setLoading(false);

    if (updateErr) {
      setError('Impossible de sauvegarder. Vérifiez votre connexion.');
      return;
    }

    navigate('/dashboard');
  };

  if (checkingAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3]">
        <div className="text-sm text-slate-500">Vérification de votre accès…</div>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3] p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <div className="text-3xl mb-4">⏳</div>
          <h1 className="text-lg font-bold text-[var(--mase-heading)]">
            Paiement en cours de validation
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            La confirmation Stripe peut prendre quelques instants. Rechargez la page dans 30 secondes.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full px-6 py-2 text-sm font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: 'var(--mase-primary)' }}
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3] p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <div className="mb-6 text-center">
            <div className="text-3xl mb-2">🏭</div>
            <h1 className="text-xl font-bold text-[var(--mase-heading)]">
              Configurez votre entreprise
            </h1>
            <p className="mt-1 text-sm text-[var(--mase-muted)]">
              Ces informations apparaîtront dans vos documents QHSE
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--mase-heading)] mb-1">
                Nom de l'entreprise *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="ACME SAS"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--mase-primary)] focus:ring-1 focus:ring-[var(--mase-primary)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--mase-heading)] mb-1">
                SIRET <span className="text-slate-400 font-normal">(optionnel)</span>
              </label>
              <input
                type="text"
                value={siret}
                onChange={(e) => setSiret(e.target.value)}
                placeholder="12345678900012"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--mase-primary)] focus:ring-1 focus:ring-[var(--mase-primary)]"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="mt-2 w-full rounded-full py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--mase-primary)' }}
            >
              {loading ? 'Enregistrement…' : 'Accéder à mon dashboard →'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-400">
            Vous pourrez inviter votre équipe depuis le dashboard
          </p>
        </div>
      </div>
    </div>
  );
}
