// src/components/cartographie/phase1/Phase1Wizard.tsx
import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { ProcessMap, ProcessDefinition } from '../../../types/cartographie';
import type { UseCartographieReturn } from '../../../hooks/useCartographie';
import WizardProgress from '../shared/WizardProgress';
import Step1Company from './Step1Company';
import Step2AIGeneration from './Step2AIGeneration';
import Step3Pilotage from './Step3Pilotage';
import Step4Realisation from './Step4Realisation';
import Step5Support from './Step5Support';
import Step6Validation from './Step6Validation';
import Step7Preview from './Step7Preview';
import Step8Export from './Step8Export';

interface Props {
  session: Session;
  cartographie: UseCartographieReturn;
}

export interface Phase1State {
  companyName: string;
  sector: string;
  city: string;
  headcount: number;
  sseManagerName: string;
  sseManagerRole: string;
  documentDate: string;
  processes: ProcessDefinition[];
  aiSource?: 'web_search' | 'sector_model';
  aiSourceSummary?: string;
  savedMapId?: string;
}

export interface StepProps {
  state: Phase1State;
  update: (patch: Partial<Phase1State>) => void;
  onNext: (patch?: Partial<Phase1State>) => Promise<void>;
  onBack: () => void;
  isSaving: boolean;
  cartographie: UseCartographieReturn;
}

const EMPTY_STATE: Phase1State = {
  companyName: '',
  sector: '',
  city: '',
  headcount: 0,
  sseManagerName: '',
  sseManagerRole: '',
  documentDate: new Date().toISOString().split('T')[0],
  processes: [],
};

function mapToPhase1State(map: ProcessMap): Phase1State {
  return {
    companyName: map.companyName,
    sector: map.sector,
    city: '',
    headcount: map.headcount,
    sseManagerName: map.sseManagerName,
    sseManagerRole: map.sseManagerRole,
    documentDate: map.documentDate,
    processes: map.cartographyData.processes,
    savedMapId: map.id,
  };
}

export default function Phase1Wizard({ session, cartographie }: Props) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<Phase1State>(EMPTY_STATE);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (cartographie.map) {
      setState(mapToPhase1State(cartographie.map));
      if (cartographie.map.phase1Completed) setStep(7);
    }
  }, [cartographie.map]);

  const update = (patch: Partial<Phase1State>) =>
    setState((prev) => ({ ...prev, ...patch }));

  const saveAndNext = async (patch?: Partial<Phase1State>) => {
    const next = patch ? { ...state, ...patch } : state;
    setState(next);
    setIsSaving(true);
    try {
      const saved = await cartographie.saveMap({
        id: next.savedMapId,
        companyName: next.companyName,
        sector: next.sector,
        headcount: next.headcount,
        sseManagerName: next.sseManagerName,
        sseManagerRole: next.sseManagerRole,
        documentDate: next.documentDate,
        cartographyData: { processes: next.processes },
        phase1Completed: step === 8,
        phase2Completed: false,
      });
      if (!next.savedMapId) {
        setState((prev) => ({ ...prev, savedMapId: saved.id }));
      }
    } catch (e) {
      console.error('Erreur sauvegarde:', e);
    } finally {
      setIsSaving(false);
    }
    setStep((s) => Math.min(s + 1, 8));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const stepProps = { state, update, onNext: saveAndNext, onBack: goBack, isSaving, cartographie };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f3' }}>
      <nav
        className="flex items-center justify-between px-6 py-3"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        <a href="/" className="text-lg font-bold text-white">MASE</a>
        <span className="text-sm text-white/70">{session.user.email}</span>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-8">
          <WizardProgress currentStep={step} totalSteps={8} />
        </div>

        {step === 1 && <Step1Company {...stepProps} />}
        {step === 2 && <Step2AIGeneration {...stepProps} />}
        {step === 3 && <Step3Pilotage {...stepProps} />}
        {step === 4 && <Step4Realisation {...stepProps} />}
        {step === 5 && <Step5Support {...stepProps} />}
        {step === 6 && <Step6Validation {...stepProps} />}
        {step === 7 && <Step7Preview {...stepProps} />}
        {step === 8 && <Step8Export {...stepProps} />}
      </div>
    </div>
  );
}
