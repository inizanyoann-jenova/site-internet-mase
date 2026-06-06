import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { SessionContext } from '../contexts/SessionContext';
import { useModeOperatoire } from '../hooks/useModeOperatoire';
import MoList from '../components/modes-operatoires/list/MoList';

type Screen = 'list' | 'wizard';

export default function MoWizardPage() {
  const session = useContext(SessionContext) as Session | null;
  const navigate = useNavigate();
  const mo = useModeOperatoire(session);
  const [screen, setScreen] = useState<Screen>('list');
  const [editDocId, setEditDocId] = useState<string | undefined>();

  if (!session) {
    navigate('/modes-operatoires');
    return null;
  }

  if (screen === 'wizard') {
    // Wizard implémenté dans Plan B
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🚧</div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">Wizard en cours de déploiement</h2>
          <p className="text-gray-400 mb-6 text-sm">
            {editDocId ? `Édition du mode opératoire ${editDocId}` : 'Nouveau mode opératoire'}
          </p>
          <button
            onClick={() => { setScreen('list'); setEditDocId(undefined); }}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--mase-primary)' }}
          >
            ← Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  return (
    <MoList
      docs={mo.docs}
      isLoading={mo.isLoading}
      session={session}
      onNew={() => { setEditDocId(undefined); setScreen('wizard'); }}
      onEdit={(id) => { setEditDocId(id); setScreen('wizard'); }}
      onDelete={mo.deleteMo}
    />
  );
}
