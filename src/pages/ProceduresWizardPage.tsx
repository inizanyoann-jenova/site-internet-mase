// src/pages/ProceduresWizardPage.tsx
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { SessionContext } from '../contexts/SessionContext';
import { useProcedure } from '../hooks/useProcedure';
import ProcedureList from '../components/procedures/list/ProcedureList';
import ProcedureWizard from '../components/procedures/wizard/ProcedureWizard';

type Screen = 'list' | 'wizard';

export default function ProceduresWizardPage() {
  const session = useContext(SessionContext) as Session | null;
  const navigate = useNavigate();
  const procedure = useProcedure(session);
  const [screen, setScreen] = useState<Screen>('list');
  const [editDocId, setEditDocId] = useState<string | undefined>();

  if (!session) {
    navigate('/procedures');
    return null;
  }

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(procedure.docs, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `MASE_Procedures_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  if (screen === 'wizard') {
    return (
      <ProcedureWizard
        session={session}
        procedure={procedure}
        editDocId={editDocId}
        onDone={() => { setScreen('list'); setEditDocId(undefined); }}
      />
    );
  }

  return (
    <ProcedureList
      docs={procedure.docs}
      isLoading={procedure.isLoading}
      session={session}
      onNew={() => { setEditDocId(undefined); setScreen('wizard'); }}
      onEdit={(id) => { setEditDocId(id); setScreen('wizard'); }}
      onDelete={procedure.deleteProcedure}
      onExportJSON={handleExportJSON}
    />
  );
}
