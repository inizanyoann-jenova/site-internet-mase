import { useState } from 'react';
import type { MoWizardStepProps } from './MoWizard';
import type { ConsigneSSE } from '../../../types/modesOperatoires';

const PERMIS_OPTIONS = ['Permis de travail', 'Permis feu', 'Permis fouille', 'Permis de pénétration'];

interface StringListEditorProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  aiLoading?: boolean;
  onAiSuggest?: () => void;
}

function StringListEditor({ label, items, onChange, placeholder, aiLoading, onAiSuggest }: StringListEditorProps) {
  const [draft, setDraft] = useState('');

  const add = () => {
    if (!draft.trim()) return;
    onChange([...items, draft.trim()]);
    setDraft('');
  };

  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700">{label}</label>
        {onAiSuggest && (
          <button
            onClick={onAiSuggest}
            disabled={aiLoading}
            className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-40"
          >
            {aiLoading ? '⏳ IA…' : '✨ Suggérer par IA'}
          </button>
        )}
      </div>
      <div className="space-y-1 mb-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
            <span className="flex-1 text-gray-700">{item}</span>
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400">×</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-300"
        />
        <button onClick={add} className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:border-gray-300">+</button>
      </div>
    </div>
  );
}

export default function MoStep2SSE({ state, update, onNext, onBack, isSaving, mo }: MoWizardStepProps) {
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const sse = state.consignesSSE;

  const patchSSE = (patch: Partial<ConsigneSSE>) => {
    update({ consignesSSE: { ...sse, ...patch } });
  };

  const handleAiSuggest = async () => {
    setAiLoading('sse');
    try {
      const result = await mo.callAiSuggest({
        questionType: 'sse',
        operationType: state.operationType,
        title: state.title,
      });
      try {
        const parsed = JSON.parse(result.suggestion) as Partial<ConsigneSSE>;
        patchSSE({
          risques: parsed.risques?.length ? parsed.risques : sse.risques,
          reglesSecurite: parsed.reglesSecurite?.length ? parsed.reglesSecurite : sse.reglesSecurite,
          consignesEnv: parsed.consignesEnv?.length ? parsed.consignesEnv : sse.consignesEnv,
        });
      } catch {
        patchSSE({ risques: [...sse.risques, result.suggestion] });
      }
    } catch (e) {
      console.error('AI suggest SSE error:', e);
    } finally {
      setAiLoading(null);
    }
  };

  const togglePermis = (p: string) => {
    const current = sse.permisRequis;
    patchSSE({
      permisRequis: current.includes(p) ? current.filter((x) => x !== p) : [...current, p],
    });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8">
      <h2 className="mb-2 text-xl font-black text-gray-900">Étape 2 — Consignes SSE</h2>
      <p className="mb-6 text-sm text-gray-400">Risques identifiés, règles de sécurité et permis de travail pour cette opération.</p>

      <StringListEditor
        label="Risques identifiés"
        items={sse.risques}
        onChange={(v) => patchSSE({ risques: v })}
        placeholder="Ex : Chute de hauteur"
        aiLoading={aiLoading === 'sse'}
        onAiSuggest={handleAiSuggest}
      />

      <StringListEditor
        label="Règles de sécurité"
        items={sse.reglesSecurite}
        onChange={(v) => patchSSE({ reglesSecurite: v })}
        placeholder="Ex : Toujours utiliser un harnais certifié"
      />

      <StringListEditor
        label="Consignes environnementales"
        items={sse.consignesEnv}
        onChange={(v) => patchSSE({ consignesEnv: v })}
        placeholder="Ex : Récupérer les huiles dans des bacs de rétention"
      />

      {/* Permis requis */}
      <div className="mb-8">
        <label className="mb-2 block text-sm font-semibold text-gray-700">Permis de travail requis</label>
        <div className="flex flex-wrap gap-3">
          {PERMIS_OPTIONS.map((p) => (
            <label key={p} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sse.permisRequis.includes(p)}
                onChange={() => togglePermis(p)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">{p}</span>
            </label>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {sse.permisRequis.filter((p) => !PERMIS_OPTIONS.includes(p)).map((p, i) => (
            <span key={i} className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
              {p}
              <button onClick={() => patchSSE({ permisRequis: sse.permisRequis.filter((x) => x !== p) })} className="ml-1 text-orange-400">×</button>
            </span>
          ))}
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
