// src/components/procedures/wizard/Step2Context.tsx
import { useState } from 'react';
import type { WizardStepProps } from './ProcedureWizard';

export default function Step2Context({ state, update, onNext, onBack, isSaving, procedure }: WizardStepProps) {
  const [loadingAI, setLoadingAI] = useState<'objective' | 'kpi' | null>(null);

  const suggestWithAI = async (type: 'objective' | 'kpi') => {
    if (!state.title) return;
    setLoadingAI(type);
    try {
      const result = await procedure.callAiSuggest({
        questionType: type,
        title: state.title,
        sector: 'BTP / Maintenance industrielle',
        processParent: state.processParent,
      });
      if (type === 'objective') update({ objective: result.suggestion });
      else update({ kpi: result.suggestion });
    } catch (e) {
      console.error('Erreur IA:', e);
    } finally {
      setLoadingAI(null);
    }
  };

  const canNext = state.objective.trim().length > 0;
  const inputCls = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
  const textareaCls = `${inputCls} min-h-[80px] resize-y`;
  const labelCls = 'mb-1.5 block text-sm font-semibold text-gray-700';

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-xl font-bold text-gray-900">Contexte & Objectif</h2>
      <p className="mb-6 text-sm text-gray-500">Définissez l'objectif, le domaine d'application et les documents associés.</p>

      <div className="flex flex-col gap-5">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700">Objectif de la procédure *</label>
            <button onClick={() => suggestWithAI('objective')} disabled={!state.title || loadingAI === 'objective'}
              className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50">
              {loadingAI === 'objective' ? '⏳ IA…' : "✨ Suggérer avec l'IA"}
            </button>
          </div>
          <textarea className={textareaCls} value={state.objective} onChange={(e) => update({ objective: e.target.value })}
            placeholder="ex: Définir la procédure d'élaboration du plan de prévention pour toute intervention d'une entreprise extérieure." />
        </div>

        <div>
          <label className={labelCls}>Domaine d'application</label>
          <textarea className={textareaCls} value={state.domain} onChange={(e) => update({ domain: e.target.value })}
            placeholder="ex: Toutes interventions d'entreprises extérieures sur sites clients." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Documents entrants</label>
            <textarea className={`${textareaCls} min-h-[60px]`} value={state.docsIn} onChange={(e) => update({ docsIn: e.target.value })}
              placeholder="ex: Contrat/commande, fiche de poste, DUER client" />
          </div>
          <div>
            <label className={labelCls}>Documents sortants</label>
            <textarea className={`${textareaCls} min-h-[60px]`} value={state.docsOut} onChange={(e) => update({ docsOut: e.target.value })}
              placeholder="ex: Plan de Prévention signé, PV d'inspection commune" />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700">Indicateurs de performance (KPI)</label>
            <button onClick={() => suggestWithAI('kpi')} disabled={!state.title || loadingAI === 'kpi'}
              className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50">
              {loadingAI === 'kpi' ? '⏳ IA…' : "✨ Suggérer avec l'IA"}
            </button>
          </div>
          <input className={inputCls} value={state.kpi} onChange={(e) => update({ kpi: e.target.value })}
            placeholder="ex: 100% des interventions EE couvertes par un PP · 0 intervention sans PP validé" />
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50">← Retour</button>
        <button onClick={() => onNext()} disabled={!canNext || isSaving}
          className="rounded-xl px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}>
          {isSaving ? 'Sauvegarde…' : 'Étape suivante →'}
        </button>
      </div>
    </div>
  );
}
