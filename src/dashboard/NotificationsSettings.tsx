// src/dashboard/NotificationsSettings.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface NotifPrefs {
  notif_habilitations: boolean;
  hab_jours_avant: number[];
  notif_actions_retard: boolean;
  notif_reunions: boolean;
  reunions_jours_avant: number;
  emails_destinataires: string;
  heure_envoi: string;
}

const DEFAULT: NotifPrefs = {
  notif_habilitations: true,
  hab_jours_avant: [30, 14, 7],
  notif_actions_retard: true,
  notif_reunions: false,
  reunions_jours_avant: 3,
  emails_destinataires: '',
  heure_envoi: '07:00',
};

interface Props { companyId: string; isAdmin: boolean }

export default function NotificationsSettings({ companyId, isAdmin }: Props) {
  const [prefs, setPrefs] = useState<NotifPrefs>({ ...DEFAULT });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [prefId, setPrefId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('notification_preferences')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrefId(data.id);
          setPrefs({
            notif_habilitations: data.notif_habilitations,
            hab_jours_avant: data.hab_jours_avant ?? [30, 14, 7],
            notif_actions_retard: data.notif_actions_retard,
            notif_reunions: data.notif_reunions,
            reunions_jours_avant: data.reunions_jours_avant,
            emails_destinataires: data.emails_destinataires,
            heure_envoi: data.heure_envoi,
          });
        }
        setLoaded(true);
      });
  }, [companyId]);

  function toggleJour(j: number) {
    setPrefs(p => ({
      ...p,
      hab_jours_avant: p.hab_jours_avant.includes(j)
        ? p.hab_jours_avant.filter(d => d !== j)
        : [...p.hab_jours_avant, j].sort((a, b) => b - a),
    }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const payload = { ...prefs, company_id: companyId, updated_at: new Date().toISOString() };
    const { error } = prefId
      ? await supabase.from('notification_preferences').update(payload).eq('id', prefId)
      : await supabase.from('notification_preferences').insert(payload).select().single().then(async r => {
          if (r.data) setPrefId(r.data.id);
          return r;
        });
    setSaving(false);
    if (error) setMsg({ type: 'err', text: `Erreur : ${error.message}` });
    else setMsg({ type: 'ok', text: 'Préférences enregistrées. Les alertes seront envoyées chaque matin.' });
  }

  if (!loaded) return <div className="p-6 text-gray-500">Chargement…</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="db-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifications email</h1>
          <p className="text-sm text-gray-500">Alertes automatiques envoyées chaque matin</p>
        </div>
      </div>

      {msg && <div className={msg.type === 'ok' ? 'db-alert-green' : 'db-alert-red'}>{msg.text}</div>}

      <div className="db-panel space-y-6">
        {/* Destinataires */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Adresses email destinataires</label>
          <input
            className="db-input"
            value={prefs.emails_destinataires}
            onChange={e => setPrefs(p => ({ ...p, emails_destinataires: e.target.value }))}
            placeholder="admin@entreprise.fr, qhse@entreprise.fr"
            disabled={!isAdmin}
          />
          <p className="mt-1 text-xs text-gray-400">Séparer plusieurs adresses par des virgules</p>
        </div>

        {/* Habilitations */}
        <div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="hab" checked={prefs.notif_habilitations} onChange={e => setPrefs(p => ({ ...p, notif_habilitations: e.target.checked }))} disabled={!isAdmin} />
            <label htmlFor="hab" className="text-sm font-medium text-gray-700">Alertes habilitations expirantes</label>
          </div>
          {prefs.notif_habilitations && (
            <div className="mt-2 ml-6">
              <p className="mb-2 text-xs text-gray-500">Envoyer un email X jours avant l'expiration :</p>
              <div className="flex gap-2">
                {[60, 30, 14, 7, 3].map(j => (
                  <button
                    key={j}
                    onClick={() => isAdmin && toggleJour(j)}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${prefs.hab_jours_avant.includes(j) ? 'bg-mase-green text-white' : 'bg-gray-100 text-gray-600'} ${!isAdmin ? 'cursor-default opacity-60' : 'hover:bg-mase-green/80 hover:text-white'}`}
                  >
                    {j}j
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions en retard */}
        <div className="flex items-center gap-3">
          <input type="checkbox" id="actions" checked={prefs.notif_actions_retard} onChange={e => setPrefs(p => ({ ...p, notif_actions_retard: e.target.checked }))} disabled={!isAdmin} />
          <label htmlFor="actions" className="text-sm font-medium text-gray-700">Alertes actions PDCA en retard</label>
        </div>

        {/* Réunions */}
        <div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="reunions" checked={prefs.notif_reunions} onChange={e => setPrefs(p => ({ ...p, notif_reunions: e.target.checked }))} disabled={!isAdmin} />
            <label htmlFor="reunions" className="text-sm font-medium text-gray-700">Rappel réunions QHSE à venir</label>
          </div>
          {prefs.notif_reunions && (
            <div className="mt-2 ml-6 flex items-center gap-2">
              <input
                type="number" min={1} max={14} className="db-input w-20"
                value={prefs.reunions_jours_avant}
                onChange={e => setPrefs(p => ({ ...p, reunions_jours_avant: Number(e.target.value) }))}
                disabled={!isAdmin}
              />
              <span className="text-sm text-gray-600">jours avant</span>
            </div>
          )}
        </div>

        {isAdmin && (
          <button className="db-btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer les préférences'}
          </button>
        )}

        {!isAdmin && (
          <p className="text-sm text-gray-500">Seul l'admin peut modifier ces paramètres.</p>
        )}
      </div>
    </div>
  );
}
