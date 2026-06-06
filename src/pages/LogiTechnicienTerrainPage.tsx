import { useContext, useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { SessionContext } from '../contexts/SessionContext';
import { useModeOperatoire } from '../hooks/useModeOperatoire';
import type { ModeOperatoire, PhaseStep } from '../types/modesOperatoires';
import { OPERATION_TYPE_LABELS, OPERATION_TYPE_ICONS } from '../types/modesOperatoires';

type PhaseKey = 'preparation' | 'execution' | 'finTache';

const PHASE_CONFIG: { key: PhaseKey; label: string; color: string; bg: string }[] = [
  { key: 'preparation', label: 'Préparation', color: 'text-blue-700', bg: 'bg-blue-50' },
  { key: 'execution', label: 'Exécution', color: 'text-yellow-700', bg: 'bg-yellow-50' },
  { key: 'finTache', label: 'Fin de tâche', color: 'text-green-700', bg: 'bg-green-50' },
];

function getStorageKey(moId: string) {
  return `mo-terrain-progress-${moId}`;
}

export default function LogiTechnicienTerrainPage() {
  const session = useContext(SessionContext) as Session | null;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const mo = useModeOperatoire(session);
  const [doc, setDoc] = useState<ModeOperatoire | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!id || mo.isLoading) return;
    const found = mo.docs.find((d) => d.id === id);
    if (found) {
      setDoc(found);
      try {
        const saved = localStorage.getItem(getStorageKey(id));
        if (saved) setChecked(JSON.parse(saved));
      } catch { /* ignore */ }
    }
  }, [id, mo.docs, mo.isLoading]);

  const allSteps = useMemo(() => {
    if (!doc) return [];
    return [
      ...doc.phases.preparation,
      ...doc.phases.execution,
      ...doc.phases.finTache,
    ];
  }, [doc]);

  const totalSteps = allSteps.length;
  const completedSteps = Object.values(checked).filter(Boolean).length;

  const toggle = (stepId: string) => {
    const next = { ...checked, [stepId]: !checked[stepId] };
    setChecked(next);
    if (id) localStorage.setItem(getStorageKey(id), JSON.stringify(next));
  };

  const reset = () => {
    setChecked({});
    if (id) localStorage.removeItem(getStorageKey(id));
  };

  const hasUncheckedCritical = allSteps.some((s) => s.critique && !checked[s.id]);

  if (!session) {
    navigate('/modes-operatoires');
    return null;
  }

  if (mo.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Chargement…</div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 mb-4">Mode opératoire introuvable</div>
          <button onClick={() => navigate('/modes-operatoires/nouveau')} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--mase-primary)' }}>
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  function PhaseBlock({ phase }: { phase: typeof PHASE_CONFIG[number] }) {
    const steps = (doc as ModeOperatoire).phases[phase.key];
    if (steps.length === 0) return null;
    return (
      <div className="mb-4 rounded-2xl border border-gray-200 overflow-hidden">
        <div className={`${phase.bg} px-5 py-3`}>
          <span className={`text-sm font-bold uppercase tracking-wide ${phase.color}`}>{phase.label}</span>
        </div>
        <div className="divide-y divide-gray-100">
          {steps.map((step: PhaseStep) => {
            const isChecked = !!checked[step.id];
            return (
              <button
                key={step.id}
                onClick={() => toggle(step.id)}
                className={`w-full flex items-start gap-4 px-5 py-4 text-left transition ${
                  isChecked ? 'bg-gray-50' : step.critique ? 'bg-red-50' : 'bg-white'
                } hover:bg-gray-100`}
              >
                <div className={`mt-0.5 flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition ${
                  isChecked ? 'bg-green-500 border-green-500' : step.critique ? 'border-red-400' : 'border-gray-300'
                }`}>
                  {isChecked && (
                    <svg viewBox="0 0 12 12" className="w-4 h-4 text-white">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium leading-relaxed ${isChecked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    <span className="mr-2 text-gray-400 text-xs">{step.ordre}.</span>
                    {step.consigne}
                  </div>
                  {step.acteur && <div className="text-xs text-gray-400 mt-0.5">{step.acteur}</div>}
                </div>
                {step.critique && !isChecked && (
                  <span className="flex-shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">CRITIQUE</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header fixe */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-5 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl">{OPERATION_TYPE_ICONS[doc.operationType] ?? '📋'}</span>
            <div className="min-w-0">
              <div className="font-bold text-gray-900 truncate text-sm">{doc.title}</div>
              <div className="text-xs text-gray-400">{OPERATION_TYPE_LABELS[doc.operationType]} · {doc.reference}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1">
              Réinitialiser
            </button>
            <button
              onClick={() => navigate('/modes-operatoires/nouveau')}
              className="text-xs font-semibold text-white rounded-lg px-3 py-1.5"
              style={{ backgroundColor: 'var(--mase-primary)' }}
            >
              ← Retour
            </button>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0}%`, backgroundColor: 'var(--mase-primary)' }}
            />
          </div>
          <span className={`text-sm font-bold flex-shrink-0 ${completedSteps === totalSteps && totalSteps > 0 ? 'text-green-600' : 'text-gray-700'}`}>
            {completedSteps}/{totalSteps}
          </span>
        </div>

        {hasUncheckedCritical && (
          <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">
            Des étapes critiques ne sont pas encore cochées
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="mx-auto max-w-xl px-4 py-6">
        {PHASE_CONFIG.map((phase) => <PhaseBlock key={phase.key} phase={phase} />)}

        {/* Urgences */}
        {doc.urgences.length > 0 && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 overflow-hidden">
            <div className="bg-red-100 px-5 py-3">
              <span className="text-sm font-bold uppercase tracking-wide text-red-700">Urgences</span>
            </div>
            <div className="px-5 py-4 space-y-4">
              {doc.urgences.map((u) => (
                <div key={u.id}>
                  <div className="font-semibold text-red-800 text-sm mb-1">{u.scenario}</div>
                  <div className="text-xs text-red-700 whitespace-pre-line leading-relaxed">{u.conduite}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {u.contacts.map((c) => (
                      <a
                        key={c.id}
                        href={`tel:${c.telephone}`}
                        className="rounded-full bg-red-200 px-3 py-1 text-xs font-bold text-red-800"
                      >
                        {c.role} : {c.telephone}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
              {doc.pointRassemblement && (
                <div className="border-t border-red-200 pt-3 text-xs font-semibold text-red-700">
                  Rassemblement : {doc.pointRassemblement}
                </div>
              )}
            </div>
          </div>
        )}

        {completedSteps === totalSteps && totalSteps > 0 && (
          <div className="rounded-2xl border-2 border-green-300 bg-green-50 p-6 text-center">
            <div className="text-3xl mb-2">✅</div>
            <div className="font-bold text-green-700 text-lg mb-1">Toutes les étapes complétées</div>
            <div className="text-sm text-green-600">Mode opératoire réalisé avec succès</div>
          </div>
        )}
      </div>
    </div>
  );
}
