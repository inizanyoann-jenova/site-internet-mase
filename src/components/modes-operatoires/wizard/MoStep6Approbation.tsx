import type { MoWizardStepProps } from './MoWizard';
import type { Approver, Revision } from '../../../types/procedures';

export default function MoStep6Approbation({ state, update, onNext, onBack, isSaving }: MoWizardStepProps) {
  const approvers = state.approvers;
  const revisions = state.revisions;

  const updateApprover = (idx: number, patch: Partial<Approver>) => {
    const next = [...approvers];
    next[idx] = { ...next[idx], ...patch };
    update({ approvers: next });
  };

  const addRevision = () => {
    update({
      revisions: [...revisions, {
        id: crypto.randomUUID(),
        version: `V${(revisions.length + 1)}.0`,
        date: new Date().toISOString().split('T')[0],
        auteur: '',
        nature: '',
      }],
    });
  };

  const updateRevision = (idx: number, patch: Partial<Revision>) => {
    const next = [...revisions];
    next[idx] = { ...next[idx], ...patch };
    update({ revisions: next });
  };

  const deleteRevision = (idx: number) => {
    if (revisions.length <= 1) return;
    update({ revisions: revisions.filter((_, i) => i !== idx) });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8">
      <h2 className="mb-6 text-xl font-black text-gray-900">Étape 6 — Approbation & Révisions</h2>

      {/* Approbateurs */}
      <div className="mb-8">
        <label className="mb-3 block text-sm font-semibold text-gray-700">Tableau d'approbation</label>
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Rôle</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Nom</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {approvers.map((a, i) => (
                <tr key={a.id} className="border-b border-gray-50">
                  <td className="px-4 py-2.5">
                    <span className="text-sm font-medium text-gray-700">{a.role}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      value={a.nom}
                      onChange={(e) => updateApprover(i, { nom: e.target.value })}
                      placeholder="Nom Prénom"
                      className="w-full bg-transparent text-sm outline-none placeholder-gray-300"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="date"
                      value={a.date ?? ''}
                      onChange={(e) => updateApprover(i, { date: e.target.value })}
                      className="bg-transparent text-sm outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fréquence de révision */}
      <div className="mb-8">
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Fréquence de révision recommandée</label>
        <div className="flex gap-2">
          {['Annuelle', 'Biannuelle', 'Triennale', 'Sur événement'].map((f) => (
            <button
              key={f}
              onClick={() => update({ revisionFrequency: f })}
              className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                state.revisionFrequency === f
                  ? 'border-orange-400 bg-orange-50 text-orange-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Historique révisions */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-700">Historique des révisions</label>
          <button
            onClick={addRevision}
            className="rounded-xl border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:border-gray-300"
          >
            + Révision
          </button>
        </div>
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Version</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Date</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Auteur</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Nature de la modification</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {revisions.map((r, i) => (
                <tr key={r.id} className="border-b border-gray-50">
                  <td className="px-3 py-2">
                    <input
                      value={r.version}
                      onChange={(e) => updateRevision(i, { version: e.target.value })}
                      className="w-16 bg-transparent text-sm outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={r.date}
                      onChange={(e) => updateRevision(i, { date: e.target.value })}
                      className="bg-transparent text-sm outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={r.auteur}
                      onChange={(e) => updateRevision(i, { auteur: e.target.value })}
                      placeholder="Nom"
                      className="w-full bg-transparent text-sm outline-none placeholder-gray-300"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={r.nature}
                      onChange={(e) => updateRevision(i, { nature: e.target.value })}
                      placeholder="Nature"
                      className="w-full bg-transparent text-sm outline-none placeholder-gray-300"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => deleteRevision(i)}
                      disabled={revisions.length <= 1}
                      className="text-gray-300 hover:text-red-400 disabled:opacity-20"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 hover:border-gray-300">← Précédent</button>
        <button
          onClick={() => onNext()}
          disabled={isSaving}
          className="rounded-2xl px-8 py-3 font-bold text-white shadow transition hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {isSaving ? 'Sauvegarde…' : 'Suivant →'}
        </button>
      </div>
    </div>
  );
}
