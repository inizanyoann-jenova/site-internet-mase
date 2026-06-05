// src/components/procedures/wizard/Step3Steps.tsx
import { useState } from 'react';
import type { WizardStepProps } from './ProcedureWizard';
import type { StepDefinition } from '../../../types/procedures';
import StepFormRow from '../shared/StepFormRow';
import LogigrammePreview from '../shared/LogigrammePreview';

export default function Step3Steps({ state, update, onNext, onBack, isSaving, procedure }: WizardStepProps) {
  const [logiMode, setLogiMode] = useState<'flow' | 'swim'>('flow');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiDesc, setAiDesc] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);

  const addStep = (type: StepDefinition['type'] = 'activite') => {
    const num = state.steps.length + 1;
    const newStep: StepDefinition = {
      id: crypto.randomUUID(), type, num,
      activite: '', acteur: '',
      ...(type === 'activite'
        ? { routeTypeAct: 'next', routeSideAct: 'auto' }
        : { ouiLabel: 'OUI', routeTypeOui: 'next', routeSideOui: 'auto', nonLabel: 'NON', routeTypeNon: 'end', routeSideNon: 'right' }),
    };
    update({ steps: [...state.steps, newStep] });
  };

  const updateStep = (id: string, updated: StepDefinition) =>
    update({ steps: state.steps.map((s) => s.id === id ? updated : s) });

  const removeStep = (id: string) => {
    const filtered = state.steps.filter((s) => s.id !== id);
    update({ steps: filtered.map((s, i) => ({ ...s, num: i + 1 })) });
  };

  const generateWithAI = async () => {
    if (!aiDesc.trim()) return;
    setIsGenerating(true);
    try {
      const result = await procedure.callGenerateSteps({
        description: aiDesc,
        sector: 'BTP / Maintenance industrielle',
        processType: state.processParent,
      });
      update({ steps: result.steps });
      setShowAiInput(false);
      setAiDesc('');
    } catch (e) {
      console.error('Erreur génération IA:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const canNext = state.steps.length >= 1 && state.steps.every((s) => s.activite.trim().length > 0);

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Étapes & Logigramme</h2>
          <p className="text-sm text-gray-500">Construisez votre procédure étape par étape. Le logigramme se met à jour en direct.</p>
        </div>
        <button
          onClick={() => setShowAiInput((v) => !v)}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #1e5f8e, #0e8a7a)' }}
        >
          ✨ IA génère les étapes
        </button>
      </div>

      {/* AI input bar */}
      {showAiInput && (
        <div className="border-b border-amber-100 bg-amber-50 px-6 py-4">
          <p className="mb-2 text-sm font-semibold text-amber-800">Décrivez votre processus en une phrase, l'IA génère les étapes :</p>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-amber-400"
              value={aiDesc}
              onChange={(e) => setAiDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generateWithAI()}
              placeholder="ex: Vérifier les habilitations des intervenants avant le démarrage d'un chantier"
            />
            <button onClick={generateWithAI} disabled={!aiDesc.trim() || isGenerating}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: '#c9922a' }}>
              {isGenerating ? '⏳ Génération…' : 'Générer →'}
            </button>
          </div>
        </div>
      )}

      {/* Split screen */}
      <div className="grid overflow-hidden" style={{ gridTemplateColumns: '420px 1fr', minHeight: 520 }}>

        {/* LEFT: Step builder */}
        <div className="flex flex-col border-r border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            {state.steps.length} étape{state.steps.length > 1 ? 's' : ''}
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {state.steps.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm">Ajoutez une activité ou une décision,<br />ou laissez l'IA générer les étapes.</p>
              </div>
            )}
            {state.steps.map((step) => (
              <StepFormRow key={step.id} step={step}
                onChange={(u) => updateStep(step.id, u)}
                onRemove={() => removeStep(step.id)} />
            ))}
          </div>
          <div className="flex gap-2 border-t border-gray-100 bg-white p-3">
            <button onClick={() => addStep('activite')}
              className="flex-1 rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-xs font-semibold text-gray-500 hover:border-blue-300 hover:text-blue-600 transition">
              + Activité
            </button>
            <button onClick={() => addStep('decision')}
              className="flex-1 rounded-xl border-2 border-dashed border-amber-200 py-2.5 text-xs font-semibold text-amber-600 hover:border-amber-400 transition">
              🔷 Décision
            </button>
          </div>
        </div>

        {/* RIGHT: Live logigramme */}
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-2">
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {(['flow', 'swim'] as const).map((m) => (
                <button key={m} onClick={() => setLogiMode(m)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${logiMode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>
                  {m === 'flow' ? '🔀 Organigramme' : '🏊 Couloirs'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400"></span>
              <span className="text-[10px] font-semibold text-green-600">Live</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <LogigrammePreview steps={state.steps} isSwim={logiMode === 'swim'} showSizeControls />
          </div>
        </div>
      </div>

      {/* Footer navigation */}
      <div className="flex justify-between border-t border-gray-100 bg-white px-6 py-4">
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
