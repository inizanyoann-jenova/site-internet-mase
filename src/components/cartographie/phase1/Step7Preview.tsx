// src/components/cartographie/phase1/Step7Preview.tsx
import type { StepProps } from './Phase1Wizard';
import MapPreview from '../shared/MapPreview';

export default function Step7Preview({ state, onNext, onBack, isSaving }: StepProps) {
  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-xl font-bold text-gray-900">Aperçu de votre cartographie</h2>
      <p className="mb-6 text-sm text-gray-500">
        Voici votre cartographie des processus. Vérifiez que tout est correct avant de générer le PDF.
        Vous pouvez revenir en arrière pour modifier.
      </p>

      <div
        className="mb-6 rounded-xl p-4"
        style={{ border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}
      >
        <MapPreview
          processes={state.processes}
          companyName={state.companyName}
        />
      </div>

      <div className="mb-6 rounded-lg bg-blue-50 p-4" style={{ border: '1px solid #bfdbfe' }}>
        <p className="text-sm text-blue-800">
          💡 <strong>Vous pourrez modifier les noms des pilotes et les détails dans la Phase 2.</strong><br />
          Ici, vérifiez surtout l'enchaînement des processus de réalisation et les flux entre eux.
        </p>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">
          ← Modifier
        </button>
        <button
          onClick={() => onNext()}
          disabled={isSaving}
          className="rounded-lg px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {isSaving ? 'Sauvegarde…' : 'Générer le PDF →'}
        </button>
      </div>
    </div>
  );
}
