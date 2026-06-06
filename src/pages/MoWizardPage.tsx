import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { SessionContext } from '../contexts/SessionContext';
import { useModeOperatoire } from '../hooks/useModeOperatoire';
import MoList from '../components/modes-operatoires/list/MoList';
import MoWizard from '../components/modes-operatoires/wizard/MoWizard';

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
    return (
      <MoWizard
        session={session}
        mo={mo}
        editDocId={editDocId}
        onDone={() => { setScreen('list'); setEditDocId(undefined); }}
      />
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
