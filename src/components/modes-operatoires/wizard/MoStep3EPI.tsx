import { useState } from 'react';
import type { MoWizardStepProps } from './MoWizard';
import type { EpiItem } from '../../../types/modesOperatoires';
import EpiChecklistRow from '../shared/EpiChecklistRow';

export default function MoStep3EPI({ state, update, onNext, onBack, isSaving, mo }: MoWizardStepProps) {
  const [aiLoading, setAiLoading] = useState(false);

  const epis = state.epis;

  const addEpi = () => {
    update({
      epis: [...epis, { id: crypto.randomUUID(), designation: '', obligatoire: true }],
    });
  };

  const updateEpi = (idx: number, updated: EpiItem) => {
    const next = [...epis];
    next[idx] = updated;
    update({ epis: next });
  };

  const deleteEpi = (idx: number) => {
    update({ epis: epis.filter((_, i) => i !== idx) });
  };

  const handleAiSuggest = async () => {
    setAiLoading(true);
    try {
      const result = await mo.callAiSuggest({
        questionType: 'epi',
        operationType: state.operationType,
        title: state.title,
      });
      try {
        const parsed = JSON.parse(result.suggestion) as Array<{ designation: string; norme?: string; obligatoire?: boolean }>;
        if (Array.isArray(parsed)) {
          const newEpis: EpiItem[] = parsed.map((e) => ({
            id: crypto.randomUUID(),
            designation: e.designation ?? '',
            norme: e.norme,
            obligatoire: e.obligatoire !== false,
          }));
          update({ epis: newEpis });
        }
      } catch {
        console.warn('AI EPI response not parseable as JSON');
      }
    } catch (e) {
      console.error('AI suggest EPI error:', e);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900">Étape 3 — EPI requis</h2>
          <p className="mt-1 text-sm text-gray-400">Équipements de Protection Individuelle obligatoires ou recommandés.</p>
        </div>
        <button
          onClick={handleAiSuggest}
          disabled={aiLoading}
          className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-40"
        >
          {aiLoading ? '⏳ IA génère…' : '✨ Générer par IA'}
        </button>
      </div>

      {epis.length === 0 && (
        <div className="mb-4 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
          Aucun EPI défini. Utilisez l'IA ou ajoutez manuellement.
        </div>
      )}

      <div className="space-y-2 mb-4">
        {epis.map((epi, i) => (
          <EpiChecklistRow
            key={epi.id}
            epi={epi}
            onChange={(updated) => updateEpi(i, updated)}
            onDelete={() => deleteEpi(i)}
          />
        ))}
      </div>

      <button
        onClick={addEpi}
        className="mb-8 rounded-xl border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600 transition w-full"
      >
        + Ajouter un EPI
      </button>

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
