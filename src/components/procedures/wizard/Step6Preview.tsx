// src/components/procedures/wizard/Step6Preview.tsx
import type { WizardStepProps } from './ProcedureWizard';
export default function Step6Preview({ onNext, onBack, isSaving }: WizardStepProps) {
  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <h2 className="text-xl font-bold">Étape 6 — Aperçu & export</h2>
      <div className="mt-4 flex gap-3">
        <button
          onClick={onBack}
          className="rounded-xl border border-gray-300 px-6 py-3 font-bold text-gray-700"
        >
          ← Retour
        </button>
        <button
          onClick={() => onNext()}
          disabled={isSaving}
          className="rounded-xl px-6 py-3 font-bold text-white"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {isSaving ? 'Terminer' : 'Terminer'}
        </button>
      </div>
    </div>
  );
}
