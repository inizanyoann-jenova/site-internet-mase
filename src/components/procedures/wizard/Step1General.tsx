// src/components/procedures/wizard/Step1General.tsx
import type { WizardStepProps } from './ProcedureWizard';
export default function Step1General({ onNext, isSaving }: WizardStepProps) {
  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <h2 className="text-xl font-bold">Étape 1 — Informations générales</h2>
      <button
        onClick={() => onNext()}
        disabled={isSaving}
        className="mt-4 rounded-xl px-6 py-3 font-bold text-white"
        style={{ backgroundColor: 'var(--mase-primary)' }}
      >
        {isSaving ? 'Sauvegarde…' : 'Suivant →'}
      </button>
    </div>
  );
}
