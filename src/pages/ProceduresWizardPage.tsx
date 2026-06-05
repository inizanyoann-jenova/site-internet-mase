// src/pages/ProceduresWizardPage.tsx
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { SessionContext } from '../contexts/SessionContext';
import { useProcedure } from '../hooks/useProcedure';

export default function ProceduresWizardPage() {
  const session = useContext(SessionContext) as Session | null;
  const navigate = useNavigate();
  const procedure = useProcedure(session);

  if (!session) {
    navigate('/procedures');
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Wizard Procédures</h1>
      <p className="text-gray-500">
        {procedure.isLoading ? 'Chargement…' : `${procedure.docs.length} procédure(s) sauvegardée(s)`}
      </p>
      <p className="text-sm text-gray-400">Wizard — à compléter en Plan B</p>
    </div>
  );
}
