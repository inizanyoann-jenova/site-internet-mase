// src/components/procedures/wizard/ProcedureWizard.tsx
import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { ProcedureDoc } from '../../../types/procedures';
import type { UseProcedureReturn } from '../../../hooks/useProcedure';
import WizardProgress from '../../cartographie/shared/WizardProgress';
import Step1General from './Step1General';
import Step2Context from './Step2Context';
import Step3Steps from './Step3Steps';
import Step4Risks from './Step4Risks';
import Step5Approval from './Step5Approval';
import Step6Preview from './Step6Preview';

interface Props {
  session: Session;
  procedure: UseProcedureReturn;
  editDocId?: string;
  onDone: () => void;
}

export type WizardState = Omit<ProcedureDoc, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & {
  savedDocId?: string;
};

export interface WizardStepProps {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
  onNext: (patch?: Partial<WizardState>) => Promise<void>;
  onBack: () => void;
  isSaving: boolean;
  procedure: UseProcedureReturn;
  session: Session;
}

const EMPTY_STATE: WizardState = {
  title: '',
  reference: '',
  version: 'V1.0',
  documentDate: new Date().toISOString().split('T')[0],
  direction: '',
  responsible: '',
  status: 'brouillon',
  processParent: '',
  objective: '',
  domain: '',
  docsIn: '',
  docsOut: '',
  kpi: '',
  steps: [],
  risks: [],
  approvers: [
    { id: crypto.randomUUID(), role: 'Rédigé par', nom: '', date: '' },
    { id: crypto.randomUUID(), role: 'Vérifié par', nom: '', date: '' },
    { id: crypto.randomUUID(), role: 'Approuvé par', nom: '', date: '' },
  ],
  revisions: [{ id: crypto.randomUUID(), version: 'V1.0', date: new Date().toISOString().split('T')[0], auteur: '', nature: 'Création initiale' }],
  revisionFrequency: 'Annuelle',
  phaseCompleted: false,
};

function docToState(doc: ProcedureDoc): WizardState {
  return { ...doc, savedDocId: doc.id };
}

export default function ProcedureWizard({ session, procedure, editDocId, onDone }: Props) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(EMPTY_STATE);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editDocId) {
      const doc = procedure.docs.find((d) => d.id === editDocId);
      if (doc) { setState(docToState(doc)); setStep(1); }
    }
  }, [editDocId, procedure.docs]);

  const update = (patch: Partial<WizardState>) => setState((prev) => ({ ...prev, ...patch }));

  const saveAndNext = async (patch?: Partial<WizardState>) => {
    const next = patch ? { ...state, ...patch } : state;
    setState(next);
    setIsSaving(true);
    try {
      const saved = await procedure.saveProcedure({
        id: next.savedDocId,
        title: next.title || 'Sans titre',
        reference: next.reference,
        version: next.version,
        documentDate: next.documentDate,
        direction: next.direction,
        responsible: next.responsible,
        status: next.status,
        processParent: next.processParent,
        objective: next.objective,
        domain: next.domain,
        docsIn: next.docsIn,
        docsOut: next.docsOut,
        kpi: next.kpi,
        steps: next.steps,
        risks: next.risks,
        approvers: next.approvers,
        revisions: next.revisions,
        revisionFrequency: next.revisionFrequency,
        phaseCompleted: step === 6,
      });
      if (!next.savedDocId) setState((prev) => ({ ...prev, savedDocId: saved.id }));
    } catch (e) {
      console.error('Erreur sauvegarde:', e);
    } finally {
      setIsSaving(false);
    }
    if (step < 6) setStep((s) => s + 1);
    else onDone();
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));
  const stepProps: WizardStepProps = { state, update, onNext: saveAndNext, onBack: goBack, isSaving, procedure, session };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f3' }}>
      <nav className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: 'var(--mase-primary)' }}>
        <a href="/procedures" className="text-lg font-bold text-white">MASE</a>
        <span className="text-sm text-white/70">{session.user.email}</span>
      </nav>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8">
          <WizardProgress currentStep={step} totalSteps={6} />
        </div>
        {step === 1 && <Step1General {...stepProps} />}
        {step === 2 && <Step2Context {...stepProps} />}
        {step === 3 && <Step3Steps {...stepProps} />}
        {step === 4 && <Step4Risks {...stepProps} />}
        {step === 5 && <Step5Approval {...stepProps} />}
        {step === 6 && <Step6Preview {...stepProps} />}
      </div>
    </div>
  );
}
