// src/components/cartographie/phase1/Step5Support.tsx
import type { StepProps } from './Phase1Wizard';
import type { ProcessDefinition } from '../../../types/cartographie';
import ProcessFormRow from '../shared/ProcessFormRow';

export default function Step5Support({ state, update, onNext, onBack, isSaving }: StepProps) {
  const support = state.processes.filter((p) => p.type === 'support');
  const realisation = state.processes.filter((p) => p.type === 'realisation');

  const addProcess = () => {
    const newP: ProcessDefinition = {
      id: crypto.randomUUID(),
      type: 'support',
      name: '',
      pilotName: '',
      pilotRole: '',
      linkedRealisationIds: [],
    };
    update({ processes: [...state.processes, newP] });
  };

  const updateProcess = (id: string, updated: ProcessDefinition) => {
    update({ processes: state.processes.map((p) => p.id === id ? updated : p) });
  };

  const removeProcess = (id: string) => {
    update({ processes: state.processes.filter((p) => p.id !== id) });
  };

  const toggleLink = (supportId: string, realisationId: string) => {
    const p = support.find((s) => s.id === supportId);
    if (!p) return;
    const links = p.linkedRealisationIds ?? [];
    const updated = links.includes(realisationId)
      ? links.filter((id) => id !== realisationId)
      : [...links, realisationId];
    updateProcess(supportId, { ...p, linkedRealisationIds: updated });
  };

  const canNext = support.length >= 1 && support.every((p) => p.name.trim());

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-xl font-bold text-gray-900">Processus Support</h2>
      <div className="mb-6 rounded-lg p-4" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
        <p className="text-sm text-yellow-900">
          <strong>🟡 C'est quoi le support ?</strong><br />
          Les processus support ne délivrent pas directement au client, mais ils fournissent tout ce
          dont vos équipes ont besoin pour travailler : les personnes, le matériel, les outils, la
          comptabilité… Cochez quels processus de réalisation chaque support alimente.
        </p>
      </div>

      <div className="flex flex-col gap-6 mb-6">
        {support.map((p) => (
          <div key={p.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <ProcessFormRow
              process={p}
              onChange={(updated) => updateProcess(p.id, updated)}
              onRemove={() => removeProcess(p.id)}
            />
            {realisation.length > 0 && (
              <div className="mt-3">
                <label className="mb-2 block text-xs font-semibold text-gray-600">
                  Ce support alimente ces processus de réalisation :
                </label>
                <div className="flex flex-wrap gap-2">
                  {realisation.map((r) => {
                    const linked = (p.linkedRealisationIds ?? []).includes(r.id);
                    return (
                      <button
                        key={r.id}
                        onClick={() => toggleLink(p.id, r.id)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          linked
                            ? 'bg-yellow-400 text-yellow-900'
                            : 'bg-white border border-gray-300 text-gray-500 hover:border-yellow-400'
                        }`}
                      >
                        {linked ? '✓ ' : ''}{r.name || 'Sans nom'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addProcess}
        className="mb-8 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 transition hover:border-yellow-400 hover:text-yellow-600"
      >
        + Ajouter un processus support
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
          {isSaving ? 'Sauvegarde…' : 'Vérifier la cohérence →'}
        </button>
      </div>
    </div>
  );
}
