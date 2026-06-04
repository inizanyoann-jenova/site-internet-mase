// src/dashboard/AnalyseRisqueChantier.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface RisqueItem {
  id: string;
  categorie: string;
  description: string;
  gravite: 1 | 2 | 3 | 4;
  mesure: string;
}

interface Analyse {
  id: string;
  chantier: string;
  localisation: string | null;
  date_analyse: string;
  heure_debut: string | null;
  risques_identifies: RisqueItem[];
  niveau_risque: 'Faible' | 'Moyen' | 'Élevé' | 'Inacceptable';
  mesures_retenues: string | null;
  operateur: string;
  statut: 'en_cours' | 'validé' | 'terminé';
  visa_responsable: string | null;
  notes: string | null;
}

const CATEGORIES_RISQUES = [
  { label: 'Chute de hauteur', icon: '🪜' },
  { label: "Chute d'objet", icon: '📦' },
  { label: 'Électrique', icon: '⚡' },
  { label: 'Incendie / Explosion', icon: '🔥' },
  { label: 'Chimique / Toxique', icon: '☣️' },
  { label: 'Engins / Véhicules', icon: '🚜' },
  { label: 'Manutention', icon: '💪' },
  { label: 'Bruit / Vibrations', icon: '📢' },
  { label: 'Co-activité', icon: '👷' },
  { label: 'Conditions météo', icon: '🌧️' },
  { label: 'Autre', icon: '⚠️' },
];

const GRAVITE_CONFIG = [
  { value: 1 as const, label: 'Faible', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 2 as const, label: 'Moyen', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 3 as const, label: 'Élevé', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 4 as const, label: 'Critique', color: 'bg-red-100 text-red-700 border-red-300' },
];

const NIVEAU_COLORS: Record<string, string> = {
  Faible:       'bg-green-100 text-green-700',
  Moyen:        'bg-yellow-100 text-yellow-700',
  Élevé:        'bg-orange-100 text-orange-700',
  Inacceptable: 'bg-red-100 text-red-700',
};

function calcNiveauGlobal(risques: RisqueItem[]): Analyse['niveau_risque'] {
  if (risques.length === 0) return 'Faible';
  const max = Math.max(...risques.map(r => r.gravite));
  if (max >= 4) return 'Inacceptable';
  if (max === 3) return 'Élevé';
  if (max === 2) return 'Moyen';
  return 'Faible';
}

type View = 'liste' | 'detail' | 'new';
type Step = 'info' | 'risques' | 'mesures' | 'validation';

const EMPTY_FORM = {
  chantier: '', localisation: '', operateur: '',
  heure_debut: new Date().toTimeString().slice(0, 5),
  date_analyse: new Date().toISOString().slice(0, 10),
  notes: '',
};

interface Props { companyId: string; canWrite: boolean }

export default function AnalyseRisqueChantier({ companyId, canWrite }: Props) {
  const [analyses, setAnalyses] = useState<Analyse[]>([]);
  const [view, setView] = useState<View>('liste');
  const [selected, setSelected] = useState<Analyse | null>(null);
  const [step, setStep] = useState<Step>('info');
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [risques, setRisques] = useState<RisqueItem[]>([]);
  const [mesures, setMesures] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('risques_chantier')
      .select('*')
      .eq('company_id', companyId)
      .order('date_analyse', { ascending: false })
      .limit(50);
    setAnalyses((data ?? []) as Analyse[]);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  function startNew() {
    setForm({ ...EMPTY_FORM });
    setRisques([]);
    setMesures('');
    setStep('info');
    setView('new');
  }

  function addRisque(categorie: string) {
    setRisques(r => [...r, {
      id: crypto.randomUUID(),
      categorie,
      description: '',
      gravite: 2,
      mesure: '',
    }]);
  }

  function updateRisque(id: string, patch: Partial<RisqueItem>) {
    setRisques(r => r.map(item => item.id === id ? { ...item, ...patch } : item));
  }

  function removeRisque(id: string) {
    setRisques(r => r.filter(item => item.id !== id));
  }

  async function saveAnalyse(operateur: string, visa: string) {
    setSaving(true);
    const niveau = calcNiveauGlobal(risques);
    await supabase.from('risques_chantier').insert({
      company_id: companyId,
      chantier: form.chantier,
      localisation: form.localisation || null,
      date_analyse: form.date_analyse,
      heure_debut: form.heure_debut || null,
      risques_identifies: risques,
      niveau_risque: niveau,
      mesures_retenues: mesures || null,
      operateur,
      visa_responsable: visa || null,
      notes: form.notes || null,
      statut: visa ? 'validé' : 'en_cours',
    });
    await load();
    setView('liste');
    setSaving(false);
  }

  async function changeStatut(id: string, statut: Analyse['statut']) {
    await supabase.from('risques_chantier').update({ statut }).eq('id', id);
    await load();
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, statut } : null);
  }

  // ── Vue liste ──────────────────────────────────────────────────────────────
  if (view === 'liste') return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analyse Risque Chantier</h1>
          <p className="text-sm text-gray-500">Saisie terrain sur mobile</p>
        </div>
        {canWrite && (
          <button className="db-btn-primary text-base py-3 px-5" onClick={startNew}>
            + Nouvelle analyse
          </button>
        )}
      </div>

      <div className="flex gap-3">
        {(['Inacceptable', 'Élevé', 'Moyen', 'Faible'] as const).map(n => (
          <div key={n} className="db-kpi">
            <div className={`text-xl font-bold rounded px-2 py-0.5 ${NIVEAU_COLORS[n]}`}>
              {analyses.filter(a => a.niveau_risque === n).length}
            </div>
            <div className="text-xs text-gray-500">{n}</div>
          </div>
        ))}
      </div>

      {analyses.length === 0 ? (
        <div className="db-panel p-8 text-center text-gray-400">Aucune analyse enregistrée.</div>
      ) : (
        <div className="space-y-2">
          {analyses.map(a => (
            <div
              key={a.id}
              className="db-panel cursor-pointer transition-colors hover:border-mase-green"
              onClick={() => { setSelected(a); setView('detail'); }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{a.chantier}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(a.date_analyse).toLocaleDateString('fr-FR')}
                    {a.heure_debut && ` à ${a.heure_debut}`}
                    {a.localisation && ` — ${a.localisation}`}
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    {a.risques_identifies.length} risque(s) — par {a.operateur}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${NIVEAU_COLORS[a.niveau_risque]}`}>
                    {a.niveau_risque}
                  </span>
                  <span className={`rounded px-2 py-0.5 text-xs ${a.statut === 'validé' ? 'bg-green-100 text-green-700' : a.statut === 'terminé' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
                    {a.statut}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Vue détail ─────────────────────────────────────────────────────────────
  if (view === 'detail' && selected) return (
    <div className="space-y-4 p-4">
      <button className="text-sm text-gray-500 hover:underline" onClick={() => setView('liste')}>← Retour</button>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{selected.chantier}</h2>
          <p className="text-sm text-gray-500">{new Date(selected.date_analyse).toLocaleDateString('fr-FR')} — {selected.operateur}</p>
        </div>
        <span className={`rounded px-3 py-1 text-sm font-bold ${NIVEAU_COLORS[selected.niveau_risque]}`}>{selected.niveau_risque}</span>
      </div>

      {selected.risques_identifies.map(r => (
        <div key={r.id} className={`db-panel border-l-4 ${r.gravite >= 3 ? 'border-orange-400' : r.gravite >= 2 ? 'border-yellow-400' : 'border-green-400'}`}>
          <div className="font-medium text-gray-800">{r.categorie}</div>
          {r.description && <div className="text-sm text-gray-600">{r.description}</div>}
          <div className="mt-1 text-xs text-gray-500">Gravité : <strong>{GRAVITE_CONFIG[r.gravite - 1]?.label}</strong></div>
          {r.mesure && <div className="mt-1 text-xs text-green-700">✓ {r.mesure}</div>}
        </div>
      ))}

      {selected.mesures_retenues && (
        <div className="db-panel">
          <div className="mb-1 text-sm font-medium text-gray-700">Mesures globales retenues</div>
          <div className="text-sm text-gray-600">{selected.mesures_retenues}</div>
        </div>
      )}

      {canWrite && selected.statut === 'en_cours' && (
        <div className="flex gap-2">
          <button className="db-btn-primary flex-1" onClick={() => changeStatut(selected.id, 'validé')}>✓ Valider</button>
          <button className="db-btn-secondary flex-1" onClick={() => changeStatut(selected.id, 'terminé')}>Terminer</button>
        </div>
      )}
    </div>
  );

  // ── Vue saisie nouvelle analyse (multi-étapes) ────────────────────────────
  return (
    <div className="space-y-4 p-4">
      <button className="text-sm text-gray-500 hover:underline" onClick={() => setView('liste')}>← Annuler</button>
      <h2 className="text-lg font-bold text-gray-900">Nouvelle analyse de risque</h2>

      {/* Progress */}
      <div className="flex gap-1">
        {(['info', 'risques', 'mesures', 'validation'] as Step[]).map((s, i) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${step === s ? 'bg-mase-green' : ['info', 'risques', 'mesures', 'validation'].indexOf(step) > i ? 'bg-green-300' : 'bg-gray-200'}`} />
        ))}
      </div>

      {/* ── Étape 1 : Info chantier ── */}
      {step === 'info' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">1. Information chantier</h3>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Chantier / Intervention *</label>
            <input className="db-input text-base" value={form.chantier} onChange={e => setForm(f => ({ ...f, chantier: e.target.value }))} placeholder="Ex : Remplacement toiture Bât A" autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Localisation</label>
            <input className="db-input text-base" value={form.localisation} onChange={e => setForm(f => ({ ...f, localisation: e.target.value }))} placeholder="Bâtiment, zone, adresse..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
              <input type="date" className="db-input" value={form.date_analyse} onChange={e => setForm(f => ({ ...f, date_analyse: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Heure début</label>
              <input type="time" className="db-input" value={form.heure_debut} onChange={e => setForm(f => ({ ...f, heure_debut: e.target.value }))} />
            </div>
          </div>
          <button className="db-btn-primary w-full py-4 text-base" onClick={() => setStep('risques')} disabled={!form.chantier}>Suivant →</button>
        </div>
      )}

      {/* ── Étape 2 : Risques identifiés ── */}
      {step === 'risques' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">2. Risques identifiés</h3>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {CATEGORIES_RISQUES.map(cat => (
              <button
                key={cat.label}
                className="flex flex-col items-center rounded-xl border-2 border-gray-200 bg-white p-3 text-center text-xs transition-colors hover:border-mase-green hover:bg-green-50 active:scale-95"
                onClick={() => addRisque(cat.label)}
              >
                <span className="mb-1 text-2xl">{cat.icon}</span>
                <span className="leading-tight text-gray-700">{cat.label}</span>
              </button>
            ))}
          </div>

          {risques.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">Risques ajoutés :</h4>
              {risques.map(r => (
                <div key={r.id} className="db-panel space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">{r.categorie}</span>
                    <button className="text-red-400 hover:text-red-600" onClick={() => removeRisque(r.id)}>✕</button>
                  </div>
                  <input
                    className="db-input"
                    placeholder="Description du risque (optionnel)"
                    value={r.description}
                    onChange={e => updateRisque(r.id, { description: e.target.value })}
                  />
                  <div className="flex gap-2">
                    {GRAVITE_CONFIG.map(g => (
                      <button
                        key={g.value}
                        onClick={() => updateRisque(r.id, { gravite: g.value })}
                        className={`flex-1 rounded-lg border-2 py-2 text-xs font-bold transition-all ${r.gravite === g.value ? g.color + ' ring-2 ring-offset-1 ring-current' : 'border-gray-200 bg-white text-gray-500'}`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                  <input
                    className="db-input"
                    placeholder="Mesure de prévention (optionnel)"
                    value={r.mesure}
                    onChange={e => updateRisque(r.id, { mesure: e.target.value })}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button className="db-btn-secondary flex-1 py-3" onClick={() => setStep('info')}>← Retour</button>
            <button className="db-btn-primary flex-1 py-3 text-base" onClick={() => setStep('mesures')}>Suivant →</button>
          </div>
        </div>
      )}

      {/* ── Étape 3 : Mesures globales ── */}
      {step === 'mesures' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">3. Mesures de prévention globales</h3>
          <div className={`rounded-xl p-3 text-center text-sm font-bold ${NIVEAU_COLORS[calcNiveauGlobal(risques)]}`}>
            Niveau de risque global : {calcNiveauGlobal(risques)}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mesures collectives retenues</label>
            <textarea
              className="db-input text-base"
              rows={4}
              value={mesures}
              onChange={e => setMesures(e.target.value)}
              placeholder="EPI obligatoires, balisage, permis de travail, co-activité gérée..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
            <textarea className="db-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button className="db-btn-secondary flex-1 py-3" onClick={() => setStep('risques')}>← Retour</button>
            <button className="db-btn-primary flex-1 py-3 text-base" onClick={() => setStep('validation')}>Suivant →</button>
          </div>
        </div>
      )}

      {/* ── Étape 4 : Validation ── */}
      {step === 'validation' && (
        <ValidationStep
          form={form}
          setForm={setForm}
          saving={saving}
          onBack={() => setStep('mesures')}
          onSave={saveAnalyse}
        />
      )}
    </div>
  );
}

function ValidationStep({ form, setForm, saving, onBack, onSave }: {
  form: { operateur: string; [k: string]: string };
  setForm: (fn: (f: { operateur: string; [k: string]: string }) => { operateur: string; [k: string]: string }) => void;
  saving: boolean;
  onBack: () => void;
  onSave: (operateur: string, visa: string) => void;
}) {
  const [visa, setVisa] = useState('');
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">4. Validation</h3>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Nom de l'opérateur *</label>
        <input
          className="db-input text-base"
          value={form.operateur}
          onChange={e => setForm(f => ({ ...f, operateur: e.target.value }))}
          placeholder="Prénom Nom"
          autoFocus
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Visa responsable (optionnel)</label>
        <input
          className="db-input text-base"
          value={visa}
          onChange={e => setVisa(e.target.value)}
          placeholder="Nom du responsable qui valide"
        />
      </div>
      <div className="flex gap-2">
        <button className="db-btn-secondary flex-1 py-3" onClick={onBack}>← Retour</button>
        <button
          className="db-btn-primary flex-1 py-4 text-base font-bold"
          onClick={() => onSave(form.operateur, visa)}
          disabled={saving || !form.operateur}
        >
          {saving ? 'Enregistrement…' : "✓ Valider l'analyse"}
        </button>
      </div>
    </div>
  );
}
