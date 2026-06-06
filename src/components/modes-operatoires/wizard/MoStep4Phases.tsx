import { useState } from 'react';
import type { MoWizardStepProps } from './MoWizard';
import type { PhaseStep } from '../../../types/modesOperatoires';
import LogiTechnicienPreview from '../shared/LogiTechnicienPreview';

type PhaseKey = 'preparation' | 'execution' | 'finTache';

const PHASE_LABELS: Record<PhaseKey, string> = {
  preparation: 'Préparation',
  execution: 'Exécution',
  finTache: 'Fin de tâche',
};

interface PhaseEditorProps {
  steps: PhaseStep[];
  onChange: (steps: PhaseStep[]) => void;
  phaseKey: PhaseKey;
}

function PhaseEditor({ steps, onChange, phaseKey }: PhaseEditorProps) {
  const addStep = () => {
    const newStep: PhaseStep = {
      id: crypto.randomUUID(),
      ordre: steps.length + 1,
      consigne: '',
      critique: false,
      pointControle: false,
    };
    onChange([...steps, newStep]);
  };

  const updateStep = (idx: number, patch: Partial<PhaseStep>) => {
    const next = steps.map((s, i) => i === idx ? { ...s, ...patch } : s);
    onChange(next);
  };

  const deleteStep = (idx: number) => {
    const next = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, ordre: i + 1 }));
    onChange(next);
  };

  const colors: Record<PhaseKey, string> = {
    preparation: 'border-blue-200 bg-blue-50',
    execution: 'border-yellow-200 bg-yellow-50',
    finTache: 'border-green-200 bg-green-50',
  };

  return (
    <div className={`rounded-xl border-2 ${colors[phaseKey]} p-4`}>
      <div className="mb-3 font-bold text-gray-700 text-sm uppercase tracking-wide">{PHASE_LABELS[phaseKey]}</div>

      {steps.length === 0 && (
        <div className="text-xs text-gray-400 mb-2 italic">Aucune étape — cliquez + pour ajouter</div>
      )}

      <div className="space-y-2 mb-3">
        {steps.map((step, i) => (
          <div key={step.id} className="rounded-xl border border-white bg-white p-3 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500">{step.ordre}</span>
              <div className="flex-1 min-w-0">
                <input
                  value={step.consigne}
                  onChange={(e) => updateStep(i, { consigne: e.target.value })}
                  placeholder="Consigne de l'étape"
                  className="w-full text-sm text-gray-800 outline-none placeholder-gray-300"
                />
                <div className="mt-1.5 flex gap-3">
                  <input
                    value={step.acteur ?? ''}
                    onChange={(e) => updateStep(i, { acteur: e.target.value || undefined })}
                    placeholder="Acteur"
                    className="flex-1 text-xs text-gray-400 outline-none placeholder-gray-300"
                  />
                  <input
                    value={step.outil ?? ''}
                    onChange={(e) => updateStep(i, { outil: e.target.value || undefined })}
                    placeholder="Outil / EPI"
                    className="flex-1 text-xs text-gray-400 outline-none placeholder-gray-300"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={step.critique}
                    onChange={(e) => updateStep(i, { critique: e.target.checked, pointControle: e.target.checked })}
                    className="h-3 w-3"
                  />
                  <span className="text-xs text-red-500 font-medium">Critique</span>
                </label>
                <button onClick={() => deleteStep(i)} className="text-xs text-gray-300 hover:text-red-400">✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addStep}
        className="w-full rounded-xl border border-dashed border-gray-300 py-2 text-xs text-gray-400 hover:border-gray-400 transition"
      >
        + Étape
      </button>
    </div>
  );
}

export default function MoStep4Phases({ state, update, onNext, onBack, isSaving }: MoWizardStepProps) {
  const [activeTab, setActiveTab] = useState<PhaseKey>('preparation');

  const phases = state.phases;

  const updatePhase = (key: PhaseKey, steps: PhaseStep[]) => {
    update({ phases: { ...phases, [key]: steps } });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8">
      <h2 className="mb-2 text-xl font-black text-gray-900">Étape 4 — Phases de travail</h2>
      <p className="mb-6 text-sm text-gray-400">Définissez les étapes pour chaque phase. Les étapes critiques sont encadrées en rouge dans le logigramme terrain.</p>

      <div className="grid grid-cols-2 gap-6">
        {/* Éditeur de phases */}
        <div>
          <div className="mb-3 flex gap-1 rounded-xl border border-gray-100 bg-gray-50 p-1">
            {(['preparation', 'execution', 'finTache'] as PhaseKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${activeTab === key ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {PHASE_LABELS[key]}
                <span className="ml-1 text-gray-300">({phases[key].length})</span>
              </button>
            ))}
          </div>
          <PhaseEditor
            steps={phases[activeTab]}
            onChange={(steps) => updatePhase(activeTab, steps)}
            phaseKey={activeTab}
          />
        </div>

        {/* Preview logigramme live */}
        <div>
          <div className="mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Logigramme en direct</div>
          <LogiTechnicienPreview
            preparation={phases.preparation}
            execution={phases.execution}
            finTache={phases.finTache}
            className="max-h-[480px]"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-between">
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
