import { useState } from 'react';
import type { WizardStepProps } from './ProcedureWizard';
import type { RiskItem, RiskLevel } from '../../../types/procedures';

export default function Step4Risks({ state, update, onNext, onBack, isSaving, procedure }: WizardStepProps) {
  const [loadingAI, setLoadingAI] = useState(false);

  const addRisk = () =>
    update({ risks: [...state.risks, { id: crypto.randomUUID(), risque: '', niveau: 'med' as RiskLevel, controle: '' }] });

  const updateRisk = (id: string, patch: Partial<RiskItem>) =>
    update({ risks: state.risks.map((r) => r.id === id ? { ...r, ...patch } : r) });

  const removeRisk = (id: string) =>
    update({ risks: state.risks.filter((r) => r.id !== id) });

  const suggestWithAI = async () => {
    if (!state.title) return;
    setLoadingAI(true);
    try {
      const result = await procedure.callAiSuggest({ questionType: 'risks', title: state.title, sector: 'BTP / Maintenance industrielle', processParent: state.processParent });
      const parsed = JSON.parse(result.suggestion);
      if (Array.isArray(parsed)) {
        update({ risks: parsed.map((r: Record<string, string>) => ({ id: crypto.randomUUID(), risque: r.risque ?? '', niveau: (r.niveau ?? 'med') as RiskLevel, controle: r.controle ?? '' })) });
      }
    } catch (e) { console.error('Erreur IA risques:', e); }
    finally { setLoadingAI(false); }
  };

  const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 outline-none focus:border-blue-400';

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Risques & Prévention</h2>
          <p className="text-sm text-gray-500">Identifiez les risques liés à cette procédure et les mesures de prévention.</p>
        </div>
        <button onClick={suggestWithAI} disabled={!state.title || loadingAI}
          className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50">
          {loadingAI ? '⏳ IA…' : '✨ IA suggère les risques'}
        </button>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        {state.risks.map((risk) => (
          <div key={risk.id} className={`rounded-xl border-l-4 p-4 ${risk.niveau === 'high' ? 'border-red-500 bg-red-50' : risk.niveau === 'low' ? 'border-green-500 bg-green-50' : 'border-amber-400 bg-amber-50'}`}>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Niveau :</span>
              {(['low', 'med', 'high'] as RiskLevel[]).map((n) => (
                <button key={n} onClick={() => updateRisk(risk.id, { niveau: n })}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${risk.niveau === n ? (n === 'high' ? 'bg-red-500 text-white' : n === 'low' ? 'bg-green-500 text-white' : 'bg-amber-500 text-white') : 'border border-gray-200 bg-white text-gray-500'}`}>
                  {n === 'high' ? '🔴 Élevé' : n === 'med' ? '🟡 Moyen' : '🟢 Faible'}
                </button>
              ))}
              <button onClick={() => removeRisk(risk.id)} className="ml-auto rounded p-1 text-gray-400 hover:bg-white hover:text-red-500">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Risque *</label>
                <input className={inputCls} value={risk.risque} onChange={(e) => updateRisk(risk.id, { risque: e.target.value })} placeholder="ex: Intervention sans PP validé" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Mesure de prévention</label>
                <input className={inputCls} value={risk.controle} onChange={(e) => updateRisk(risk.id, { controle: e.target.value })} placeholder="ex: Suspension immédiate de l'intervention" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addRisk}
        className="mb-8 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-semibold text-gray-500 hover:border-blue-300 hover:text-blue-600 transition">
        + Ajouter un risque
      </button>

      <div className="flex justify-between">
        <button onClick={onBack} className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50">← Retour</button>
        <button onClick={() => onNext()} disabled={isSaving}
          className="rounded-xl px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}>
          {isSaving ? 'Sauvegarde…' : 'Étape suivante →'}
        </button>
      </div>
    </div>
  );
}
