// src/components/procedures/wizard/Step1General.tsx
import { useState } from 'react';
import type { WizardStepProps } from './ProcedureWizard';
import { PROCEDURE_TEMPLATES, PROC_PREFIXES } from '../../../types/procedures';

export default function Step1General({ state, update, onNext, onBack, isSaving }: WizardStepProps) {
  const [showTemplates, setShowTemplates] = useState(false);

  const handleProcessParentChange = (val: string) => {
    const prefix = PROC_PREFIXES[val] ?? 'PR';
    update({
      processParent: val,
      reference: state.reference || `${prefix}-001`,
    });
  };

  const applyTemplate = (tpl: typeof PROCEDURE_TEMPLATES[0]) => {
    update({ ...tpl.doc });
    setShowTemplates(false);
  };

  const canNext = state.title.trim().length > 0 && state.responsible.trim().length > 0;

  const inputCls = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
  const labelCls = 'mb-1.5 block text-sm font-semibold text-gray-700';

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-xl font-bold text-gray-900">Informations générales</h2>
      <p className="mb-6 text-sm text-gray-500">Identifiez votre procédure. Vous pouvez partir d'un modèle MASE prédéfini.</p>

      <button
        onClick={() => setShowTemplates((v) => !v)}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 py-3 text-sm font-semibold text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition"
      >
        ✦ Choisir un modèle MASE prédéfini ({PROCEDURE_TEMPLATES.length} disponibles)
      </button>

      {showTemplates && (
        <div className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
          {PROCEDURE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              onClick={() => applyTemplate(tpl)}
              className="flex flex-col items-start gap-1 rounded-xl border border-gray-200 bg-white p-3 text-left hover:border-blue-400 hover:shadow-sm transition"
            >
              <span className="text-2xl">{tpl.icon}</span>
              <span className="text-xs font-bold text-gray-800">{tpl.label}</span>
              <span className="text-[10px] font-mono text-gray-400">{tpl.doc.reference}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div>
          <label className={labelCls}>Titre de la procédure *</label>
          <input className={inputCls} value={state.title} onChange={(e) => update({ title: e.target.value })}
            placeholder="ex: Élaboration du Plan de Prévention" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Référence</label>
            <input className={inputCls} value={state.reference} onChange={(e) => update({ reference: e.target.value })} placeholder="PR-QHSE-001" />
          </div>
          <div>
            <label className={labelCls}>Version</label>
            <input className={inputCls} value={state.version} onChange={(e) => update({ version: e.target.value })} placeholder="V1.0" />
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" className={inputCls} value={state.documentDate} onChange={(e) => update({ documentDate: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Processus parent</label>
            <select className={inputCls} value={state.processParent} onChange={(e) => handleProcessParentChange(e.target.value)}>
              <option value="">Sélectionner…</option>
              {Object.keys(PROC_PREFIXES).map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Direction / Service</label>
            <input className={inputCls} value={state.direction} onChange={(e) => update({ direction: e.target.value })} placeholder="ex: QHSE" />
          </div>
        </div>

        <div>
          <label className={labelCls}>Responsable *</label>
          <input className={inputCls} value={state.responsible} onChange={(e) => update({ responsible: e.target.value })} placeholder="ex: Marion HUBERT — Responsable QHSE" />
        </div>

        <div>
          <label className={labelCls}>Statut</label>
          <div className="flex gap-2">
            {(['brouillon', 'valide', 'archive'] as const).map((s) => (
              <button key={s} onClick={() => update({ status: s })}
                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition ${state.status === s
                  ? (s === 'valide' ? 'border-green-400 bg-green-50 text-green-800' : s === 'archive' ? 'border-gray-400 bg-gray-100 text-gray-700' : 'border-amber-400 bg-amber-50 text-amber-800')
                  : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'}`}>
                {s === 'brouillon' ? '🟡 Brouillon' : s === 'valide' ? '🟢 Validé' : '🔘 Archivé'}
              </button>
            ))}
          </div>
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
