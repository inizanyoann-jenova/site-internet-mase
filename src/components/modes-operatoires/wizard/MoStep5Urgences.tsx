import { useState } from 'react';
import type { MoWizardStepProps } from './MoWizard';
import type { SituationUrgence, ContactUrgence } from '../../../types/modesOperatoires';

function ContactRow({ contact, onChange, onDelete }: {
  contact: ContactUrgence;
  onChange: (c: ContactUrgence) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <input
        value={contact.role}
        onChange={(e) => onChange({ ...contact, role: e.target.value })}
        placeholder="Rôle (ex : SAMU)"
        className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none"
      />
      <input
        value={contact.telephone}
        onChange={(e) => onChange({ ...contact, telephone: e.target.value })}
        placeholder="Téléphone"
        className="w-28 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none"
      />
      <button onClick={onDelete} className="text-gray-300 hover:text-red-400">×</button>
    </div>
  );
}

function SituationCard({ situation, onChange, onDelete }: {
  situation: SituationUrgence;
  onChange: (s: SituationUrgence) => void;
  onDelete: () => void;
}) {
  const addContact = () => {
    onChange({
      ...situation,
      contacts: [...situation.contacts, { id: crypto.randomUUID(), role: '', telephone: '' }],
    });
  };

  const updateContact = (idx: number, c: ContactUrgence) => {
    const next = [...situation.contacts];
    next[idx] = c;
    onChange({ ...situation, contacts: next });
  };

  const deleteContact = (idx: number) => {
    onChange({ ...situation, contacts: situation.contacts.filter((_, i) => i !== idx) });
  };

  return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <input
          value={situation.scenario}
          onChange={(e) => onChange({ ...situation, scenario: e.target.value })}
          placeholder="Scénario d'urgence (ex : Chute de hauteur)"
          className="flex-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold outline-none"
        />
        <button onClick={onDelete} className="text-red-300 hover:text-red-500 flex-shrink-0">✕</button>
      </div>

      <textarea
        value={situation.conduite}
        onChange={(e) => onChange({ ...situation, conduite: e.target.value })}
        placeholder="Conduite à tenir (numérotez les étapes)"
        rows={3}
        className="mb-3 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm outline-none resize-none"
      />

      <div className="space-y-2 mb-2">
        {situation.contacts.map((c, i) => (
          <ContactRow
            key={c.id}
            contact={c}
            onChange={(updated) => updateContact(i, updated)}
            onDelete={() => deleteContact(i)}
          />
        ))}
      </div>
      <button onClick={addContact} className="text-xs text-red-400 hover:text-red-600">+ Contact d'urgence</button>
    </div>
  );
}

export default function MoStep5Urgences({ state, update, onNext, onBack, isSaving, mo }: MoWizardStepProps) {
  const [aiLoading, setAiLoading] = useState(false);

  const urgences = state.urgences;

  const addSituation = () => {
    update({
      urgences: [...urgences, {
        id: crypto.randomUUID(),
        scenario: '',
        conduite: '',
        contacts: [
          { id: crypto.randomUUID(), role: 'SAMU', telephone: '15' },
          { id: crypto.randomUUID(), role: 'Pompiers', telephone: '18' },
        ],
      }],
    });
  };

  const updateSituation = (idx: number, s: SituationUrgence) => {
    const next = [...urgences];
    next[idx] = s;
    update({ urgences: next });
  };

  const deleteSituation = (idx: number) => {
    update({ urgences: urgences.filter((_, i) => i !== idx) });
  };

  const handleAiSuggest = async () => {
    setAiLoading(true);
    try {
      const result = await mo.callAiSuggest({
        questionType: 'urgences',
        operationType: state.operationType,
        title: state.title,
      });
      try {
        const parsed = JSON.parse(result.suggestion) as Array<{ scenario: string; conduite: string }>;
        if (Array.isArray(parsed)) {
          const newUrgences: SituationUrgence[] = parsed.map((u) => ({
            id: crypto.randomUUID(),
            scenario: u.scenario ?? '',
            conduite: u.conduite ?? '',
            contacts: [
              { id: crypto.randomUUID(), role: 'SAMU', telephone: '15' },
              { id: crypto.randomUUID(), role: 'Pompiers', telephone: '18' },
            ],
          }));
          update({ urgences: newUrgences });
        }
      } catch {
        console.warn('AI urgences response not parseable');
      }
    } catch (e) {
      console.error('AI suggest urgences error:', e);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900">Étape 5 — Situations d'urgence</h2>
          <p className="mt-1 text-sm text-gray-400">Scénarios d'urgence, conduite à tenir et contacts.</p>
        </div>
        <button
          onClick={handleAiSuggest}
          disabled={aiLoading}
          className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-40"
        >
          {aiLoading ? '⏳ IA génère…' : '✨ Générer par IA'}
        </button>
      </div>

      <div className="space-y-4 mb-4">
        {urgences.map((u, i) => (
          <SituationCard
            key={u.id}
            situation={u}
            onChange={(updated) => updateSituation(i, updated)}
            onDelete={() => deleteSituation(i)}
          />
        ))}
      </div>

      {urgences.length === 0 && (
        <div className="mb-4 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
          Aucun scénario. Utilisez l'IA ou ajoutez manuellement.
        </div>
      )}

      <button
        onClick={addSituation}
        className="mb-6 w-full rounded-xl border border-dashed border-red-200 py-2.5 text-sm text-red-400 hover:border-red-300 transition"
      >
        + Ajouter un scénario d'urgence
      </button>

      <div className="mb-8">
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Point de rassemblement</label>
        <input
          value={state.pointRassemblement ?? ''}
          onChange={(e) => update({ pointRassemblement: e.target.value })}
          placeholder="Ex : Parking principal — entrée site"
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-300"
        />
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
