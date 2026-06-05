// src/components/cartographie/phase1/Step6Validation.tsx
import type { StepProps } from './Phase1Wizard';

interface Check {
  label: string;
  ok: boolean;
  message: string;
}

function runChecks(state: StepProps['state']): Check[] {
  const pilotage = state.processes.filter((p) => p.type === 'pilotage');
  const realisation = state.processes.filter((p) => p.type === 'realisation');
  const support = state.processes.filter((p) => p.type === 'support');

  return [
    {
      label: 'Processus de pilotage',
      ok: pilotage.length >= 1 && pilotage.every((p) => p.name.trim() && p.pilotName.trim()),
      message: pilotage.length === 0
        ? "Aucun processus de pilotage — retournez à l'étape 3"
        : pilotage.some((p) => !p.pilotName.trim())
        ? "Certains processus de pilotage n'ont pas de pilote renseigné"
        : `${pilotage.length} processus de pilotage complets ✓`,
    },
    {
      label: 'Éléments entrants et sortants',
      ok: realisation.every((p) => p.inputElement?.trim() && p.outputElement?.trim()),
      message: realisation.some((p) => !p.inputElement?.trim() || !p.outputElement?.trim())
        ? "Certains processus de réalisation n'ont pas d'élément entrant ou sortant"
        : 'Tous les flux de réalisation sont renseignés ✓',
    },
    {
      label: 'Pilotes identifiés',
      ok: state.processes.every((p) => p.pilotName.trim()),
      message: state.processes.some((p) => !p.pilotName.trim())
        ? "Certains processus n'ont pas de pilote — renseignez-les pour être conforme MASE"
        : 'Tous les processus ont un pilote identifié ✓',
    },
    {
      label: 'Processus support liés',
      ok: support.every((p) => (p.linkedRealisationIds ?? []).length > 0),
      message: support.some((p) => (p.linkedRealisationIds ?? []).length === 0)
        ? "Certains processus support ne sont liés à aucun processus de réalisation"
        : 'Tous les supports sont reliés à la réalisation ✓',
    },
  ];
}

export default function Step6Validation({ state, onNext, onBack, isSaving }: StepProps) {
  const checks = runChecks(state);
  const hasBlocker = !state.processes.some((p) => p.type === 'realisation');

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-xl font-bold text-gray-900">Vérification de la cohérence</h2>
      <p className="mb-6 text-sm text-gray-500">
        L'outil vérifie que votre cartographie est complète avant de générer l'aperçu.
      </p>

      <div className="flex flex-col gap-3 mb-8">
        {checks.map((check) => (
          <div
            key={check.label}
            className="flex gap-3 rounded-lg p-4"
            style={{
              backgroundColor: check.ok ? '#f0fdf4' : '#fffbeb',
              border: `1px solid ${check.ok ? '#bbf7d0' : '#fde68a'}`,
            }}
          >
            <span className="text-lg">{check.ok ? '✅' : '⚠️'}</span>
            <div>
              <div className={`text-sm font-semibold ${check.ok ? 'text-green-800' : 'text-yellow-800'}`}>
                {check.label}
              </div>
              <div className={`text-xs ${check.ok ? 'text-green-700' : 'text-yellow-700'}`}>
                {check.message}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-lg bg-blue-50 p-4" style={{ border: '1px solid #bfdbfe' }}>
        <p className="text-sm text-blue-800">
          💡 Les avertissements ci-dessus ne bloquent pas — vous pouvez continuer et corriger
          plus tard. Seule l'absence totale de processus de réalisation bloque le passage à l'aperçu.
        </p>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">
          ← Corriger
        </button>
        <button
          onClick={() => onNext()}
          disabled={hasBlocker || isSaving}
          className="rounded-lg px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {isSaving ? 'Sauvegarde…' : "Voir l'aperçu →"}
        </button>
      </div>
    </div>
  );
}
