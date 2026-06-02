// src/pages/DashboardJoinPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthButton } from '../components/AuthButton';

interface Props {
  session: Session | null;
}

export default function DashboardJoinPage({ session }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg("Lien d'invitation invalide ou expiré.");
      return;
    }

    if (!session) return; // Attendre la connexion

    const accept = async () => {
      setStatus('loading');

      const { data: invitation, error: findErr } = await supabase
        .from('company_members')
        .select('id, email, company_id')
        .eq('invitation_token', token)
        .is('accepted_at', null)
        .maybeSingle();

      if (findErr || !invitation) {
        setStatus('error');
        setErrorMsg("Ce lien d'invitation est invalide ou a déjà été utilisé.");
        return;
      }

      if (invitation.email.toLowerCase() !== session.user.email?.toLowerCase()) {
        setStatus('error');
        setErrorMsg(`Ce lien est destiné à ${invitation.email}. Connectez-vous avec ce compte.`);
        return;
      }

      const { error: updateErr } = await supabase
        .from('company_members')
        .update({
          user_id: session.user.id,
          accepted_at: new Date().toISOString(),
          invitation_token: null,
        })
        .eq('id', invitation.id);

      if (updateErr) {
        setStatus('error');
        setErrorMsg("Erreur lors de l'acceptation. Réessayez.");
        return;
      }

      setStatus('success');
      setTimeout(() => navigate('/dashboard'), 2000);
    };

    accept();
  }, [token, session, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3] p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
        {!session && (
          <>
            <div className="text-3xl mb-4">🔐</div>
            <h1 className="text-xl font-bold text-[var(--mase-heading)]">
              Invitation au dashboard MASE
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Connectez-vous pour rejoindre l'équipe
            </p>
            <div className="mt-6 flex justify-center">
              <AuthButton session={session} />
            </div>
          </>
        )}

        {session && status === 'loading' && (
          <>
            <div className="text-3xl mb-4">⏳</div>
            <p className="text-sm text-slate-500">Validation de votre invitation…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-3xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-[var(--mase-heading)]">
              Invitation acceptée !
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Redirection vers le dashboard…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-3xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-[var(--mase-heading)]">
              Lien invalide
            </h1>
            <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 rounded-full px-6 py-2 text-sm font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: 'var(--mase-primary)' }}
            >
              Retour à l'accueil
            </button>
          </>
        )}
      </div>
    </div>
  );
}
