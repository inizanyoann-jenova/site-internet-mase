// src/components/cartographie/shared/WizardProgress.tsx
interface Props {
  currentStep: number; // 1-8
  totalSteps: number;
}

const STEP_LABELS = [
  'Entreprise', 'Modèle IA', 'Pilotage',
  'Réalisation', 'Support', 'Validation',
  'Aperçu', 'Export',
];

export default function WizardProgress({ currentStep, totalSteps }: Props) {
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
        <span>Étape {currentStep} sur {totalSteps}</span>
        <span className="font-semibold text-gray-700">
          {STEP_LABELS[currentStep - 1]}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${(currentStep / totalSteps) * 100}%`,
            backgroundColor: 'var(--mase-primary)',
          }}
        />
      </div>
    </div>
  );
}
