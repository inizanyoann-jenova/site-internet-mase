import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { ModeOperatoire } from '../../../types/modesOperatoires';
import type { UseModeOperatoireReturn } from '../../../hooks/useModeOperatoire';
import MoStep1General from './MoStep1General';
import MoStep2SSE from './MoStep2SSE';
import MoStep3EPI from './MoStep3EPI';
import MoStep4Phases from './MoStep4Phases';
import MoStep5Urgences from './MoStep5Urgences';
import MoStep6Approbation from './MoStep6Approbation';
import MoStep7Export from './MoStep7Export';

interface Props {
  session: Session;
  mo: UseModeOperatoireReturn;
  editDocId?: string;
  onDone: () => void;
}

export type MoWizardState = Omit<ModeOperatoire, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & {
  savedDocId?: string;
};

export interface MoWizardStepProps {
  state: MoWizardState;
  update: (patch: Partial<MoWizardState>) => void;
  onNext: (patch?: Partial<MoWizardState>) => Promise<void>;
  onBack: () => void;
  isSaving: boolean;
  mo: UseModeOperatoireReturn;
  session: Session;
}

const STEP_LABELS = ['Infos générales', 'Consignes SSE', 'EPI', 'Phases de travail', 'Urgences', 'Approbation', 'Export'];

function makeEmptyState(): MoWizardState {
  return {
    title: '',
    reference: '',
    version: 'V1.0',
    documentDate: new Date().toISOString().split('T')[0],
    operationType: 'consignation',
    habilitations: [],
    consignesSSE: { risques: [], reglesSecurite: [], consignesEnv: [], permisRequis: [] },
    epis: [],
    phases: { preparation: [], execution: [], finTache: [] },
    urgences: [],
    pointRassemblement: '',
    approvers: [
      { id: crypto.randomUUID(), role: 'Rédigé par', nom: '', date: '' },
      { id: crypto.randomUUID(), role: 'Vérifié par', nom: '', date: '' },
      { id: crypto.randomUUID(), role: 'Approuvé par', nom: '', date: '' },
    ],
    revisions: [{ id: crypto.randomUUID(), version: 'V1.0', date: new Date().toISOString().split('T')[0], auteur: '', nature: 'Création du document' }],
    revisionFrequency: 'Annuelle',
    status: 'brouillon',
  };
}

function docToState(doc: ModeOperatoire): MoWizardState {
  return { ...doc, savedDocId: doc.id };
}

export default function MoWizard({ session, mo, editDocId, onDone }: Props) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<MoWizardState>(makeEmptyState);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editDocId) {
      const doc = mo.docs.find((d) => d.id === editDocId);
      if (doc) { setState(docToState(doc)); setStep(1); }
    } else {
      setState(makeEmptyState());
      setStep(1);
    }
  }, [editDocId, mo.docs]);

  const update = (patch: Partial<MoWizardState>) => setState((prev) => ({ ...prev, ...patch }));

  const saveAndNext = async (patch?: Partial<MoWizardState>) => {
    const next = patch ? { ...state, ...patch } : state;
    setState(next);
    setIsSaving(true);
    try {
      const saved = await mo.saveMo({
        id: next.savedDocId,
        title: next.title || 'Sans titre',
        reference: next.reference,
        version: next.version,
        documentDate: next.documentDate,
        operationType: next.operationType,
        habilitations: next.habilitations,
        consignesSSE: next.consignesSSE,
        epis: next.epis,
        phases: next.phases,
        urgences: next.urgences,
        pointRassemblement: next.pointRassemblement,
        approvers: next.approvers,
        revisions: next.revisions,
        revisionFrequency: next.revisionFrequency,
        status: next.status,
      });
      if (!next.savedDocId) setState((prev) => ({ ...prev, savedDocId: saved.id }));
    } catch (e) {
      console.error('Erreur sauvegarde MO:', e);
    } finally {
      setIsSaving(false);
    }
    if (step < 7) setStep((s) => s + 1);
    else onDone();
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));
  const stepProps: MoWizardStepProps = { state, update, onNext: saveAndNext, onBack: goBack, isSaving, mo, session };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f3' }}>
      <nav className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: 'var(--mase-primary)' }}>
        <a href="/modes-operatoires" className="text-lg font-bold text-white">CertifMASE</a>
        <span className="text-sm text-white/70">{session.user.email}</span>
      </nav>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-2 text-xs text-gray-400 font-medium tracking-wide uppercase">Modes Opératoires MASE</div>
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
            <span>Étape {step} sur 7</span>
            <span className="font-semibold text-gray-700">{STEP_LABELS[step - 1]}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(step / 7) * 100}%`, backgroundColor: 'var(--mase-primary)' }}
            />
          </div>
        </div>
        {step === 1 && <MoStep1General {...stepProps} />}
        {step === 2 && <MoStep2SSE {...stepProps} />}
        {step === 3 && <MoStep3EPI {...stepProps} />}
        {step === 4 && <MoStep4Phases {...stepProps} />}
        {step === 5 && <MoStep5Urgences {...stepProps} />}
        {step === 6 && <MoStep6Approbation {...stepProps} />}
        {step === 7 && <MoStep7Export {...stepProps} />}
      </div>
    </div>
  );
}
