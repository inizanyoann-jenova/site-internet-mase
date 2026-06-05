// src/components/cartographie/phase1/Step4Realisation.tsx
import type { StepProps } from './Phase1Wizard';
import type { ProcessDefinition } from '../../../types/cartographie';
import ProcessFormRow from '../shared/ProcessFormRow';

export default function Step4Realisation({ state, update, onNext, onBack, isSaving }: StepProps) {
  const realisation = state.processes.filter((p) => p.type === 'realisation');

  const addProcess = () => {
    const newP: ProcessDefinition = {
      id: crypto.randomUUID(),
      type: 'realisation',
      name: '',
      pilotName: '',
      pilotRole: '',
      inputElement: '',
      outputElement: '',
    };
    update({ processes: [...state.processes, newP] });
  };

  const updateProcess = (id: string, updated: ProcessDefinition) => {
    update({ processes: state.processes.map((p) => p.id === id ? updated : p) });
  };

  const removeProcess = (id: string) => {
    update({ processes: state.processes.filter((p) => p.id !== id) });
  };

  const canNext = realisation.length >= 1 && realisation.every((p) =>
    p.name.trim() && p.inputElement?.trim() && p.outputElement?.trim()
  );

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-xl font-bold text-gray-900">Processus de Réalisation</h2>
      <div className="mb-6 rounded-lg bg-green-50 p-4" style={{ border: '1px solid #bbf7d0' }}>
        <p className="text-sm text-green-900">
          <strong>🟢 C'est quoi la réalisation ?</strong><br />
          Ce sont vos activités principales — celles pour lesquelles vos clients vous paient.
          Elles transforment une demande client en un résultat concret. Renseignez ce qui entre
          (document, info) et ce qui sort (livrable, résultat) pour chaque étape.
        </p>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        {realisation.map((p) => (
          <ProcessFormRow
            key={p.id}
            process={p}
            onChange={(updated) => updateProcess(p.id, updated)}
            onRemove={() => removeProcess(p.id)}
            showInput
            allProcesses={realisation}
          />
        ))}
      </div>

      <button
        onClick={addProcess}
        className="mb-8 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 transition hover:border-green-400 hover:text-green-600"
      >
        + Ajouter un processus de réalisation
      </button>

      <div className="flex justify-between">
        <button onClick={onBack} className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">
          ← Retour
        </button>
        <button
          onClick={() => onNext()}
          disabled={!canNext || isSaving}
          className="rounded-lg px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {isSaving ? 'Sauvegarde…' : 'Étape suivante →'}
        </button>
      </div>
    </div>
  );
}
