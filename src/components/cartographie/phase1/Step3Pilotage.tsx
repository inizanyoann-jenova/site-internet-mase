// src/components/cartographie/phase1/Step3Pilotage.tsx
import type { StepProps } from './Phase1Wizard';
import type { ProcessDefinition } from '../../../types/cartographie';
import ProcessFormRow from '../shared/ProcessFormRow';

export default function Step3Pilotage({ state, update, onNext, onBack, isSaving }: StepProps) {
  const pilotage = state.processes.filter((p) => p.type === 'pilotage');

  const addProcess = () => {
    const newP: ProcessDefinition = {
      id: crypto.randomUUID(),
      type: 'pilotage',
      name: '',
      pilotName: '',
      pilotRole: '',
      role: '',
    };
    update({ processes: [...state.processes, newP] });
  };

  const updateProcess = (id: string, updated: ProcessDefinition) => {
    update({ processes: state.processes.map((p) => p.id === id ? updated : p) });
  };

  const removeProcess = (id: string) => {
    update({ processes: state.processes.filter((p) => p.id !== id) });
  };

  const canNext = pilotage.length >= 1 && pilotage.every((p) => p.name.trim());

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-xl font-bold text-gray-900">Processus de Pilotage</h2>
      <div className="mb-6 rounded-lg bg-blue-50 p-4" style={{ border: '1px solid #bfdbfe' }}>
        <p className="text-sm text-blue-900">
          <strong>🔵 C'est quoi le pilotage ?</strong><br />
          Ce sont les activités de décision stratégique — celles qui donnent le cap à toute l'entreprise.
          Exemple : la direction générale, la revue de direction, le pilotage SSE, l'amélioration continue.
          En général 2 à 4 processus de pilotage.
        </p>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        {pilotage.map((p) => (
          <ProcessFormRow
            key={p.id}
            process={p}
            onChange={(updated) => updateProcess(p.id, updated)}
            onRemove={() => removeProcess(p.id)}
            showRole
          />
        ))}
      </div>

      <button
        onClick={addProcess}
        className="mb-8 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 transition hover:border-blue-400 hover:text-blue-500"
      >
        + Ajouter un processus de pilotage
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
