// src/pages/CartographieWizardPage.tsx
import { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { SessionContext } from '../contexts/SessionContext';
import { supabase } from '../lib/supabase';
import { PAYMENT_SUSPENDED } from '../lib/paymentConfig';
import { useCartographie } from '../hooks/useCartographie';
import IntroductionScreen from '../components/cartographie/intro/IntroductionScreen';
import Phase1Wizard from '../components/cartographie/phase1/Phase1Wizard';

type Screen = 'loading' | 'no-access' | 'intro' | 'phase1';

export default function CartographieWizardPage() {
  const session = useContext(SessionContext) as Session | null;
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('loading');
  const cartographie = useCartographie(session);
  const screenSet = useRef(false);

  useEffect(() => {
    if (!session) { navigate('/cartographie'); return; }
    if (screenSet.current) return;
    if (PAYMENT_SUSPENDED) {
      if (cartographie.isLoading) return;
      screenSet.current = true;
      setScreen(cartographie.map?.phase1Completed ? 'phase1' : 'intro');
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
        if (screenSet.current) return;
        screenSet.current = true;
        if (!data) { setScreen('no-access'); return; }
        setScreen(cartographie.map?.phase1Completed ? 'phase1' : 'intro');
      });
  }, [session, navigate, cartographie.map, cartographie.isLoading]);

  if (screen === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Chargement…</div>
      </div>
    );
  }

  if (screen === 'no-access') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-gray-600">Vous n'avez pas accès à cet outil.</p>
        <a
          href="/cartographie"
          className="rounded-lg px-6 py-2 text-sm font-bold text-white"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          Voir les offres →
        </a>
      </div>
    );
  }

  if (screen === 'intro') {
    return <IntroductionScreen onStart={() => setScreen('phase1')} />;
  }

  return (
    <Phase1Wizard
      session={session!}
      cartographie={cartographie}
    />
  );
}
