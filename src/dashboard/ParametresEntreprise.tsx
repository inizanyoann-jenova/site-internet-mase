// src/dashboard/ParametresEntreprise.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface CompanyProfile {
  id: string;
  name: string;
  siret: string | null;
  secteur: string | null;
  adresse: string | null;
  telephone: string | null;
  logo_url: string | null;
}

const SECTEURS = [
  'BTP / Construction',
  'Industrie / Fabrication',
  'Transport / Logistique',
  'Énergie / Utilities',
  'Agriculture / Agroalimentaire',
  'Services',
  'Santé',
  'Autre',
];

interface Props {
  companyId: string;
  isAdmin: boolean;
}

export default function ParametresEntreprise({ companyId, isAdmin }: Props) {
  const [form, setForm] = useState<Omit<CompanyProfile, 'id'>>({
    name: '',
    siret: null,
    secteur: null,
    adresse: null,
    telephone: null,
    logo_url: null,
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    supabase
      .from('companies')
      .select('id, name, siret, secteur, adresse, telephone, logo_url')
      .eq('id', companyId)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            name: data.name ?? '',
            siret: data.siret,
            secteur: data.secteur,
            adresse: data.adresse,
            telephone: data.telephone,
            logo_url: data.logo_url,
          });
        }
        setLoaded(true);
      });
  }, [companyId]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMsg({ type: 'err', text: 'Logo trop volumineux (max 2 Mo).' });
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${companyId}/logo.${ext}`;
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
    if (error) {
      setMsg({ type: 'err', text: `Upload échoué : ${error.message}` });
    } else {
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
      setForm(f => ({ ...f, logo_url: publicUrl }));
    }
    setUploading(false);
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from('companies')
      .update({
        name: form.name,
        siret: form.siret || null,
        secteur: form.secteur || null,
        adresse: form.adresse || null,
        telephone: form.telephone || null,
        logo_url: form.logo_url || null,
      })
      .eq('id', companyId);
    setSaving(false);
    if (error) {
      setMsg({ type: 'err', text: `Erreur : ${error.message}` });
    } else {
      setMsg({ type: 'ok', text: 'Paramètres enregistrés.' });
    }
  }

  if (!loaded) return <div className="p-6 text-gray-500">Chargement…</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="db-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Paramètres de l'entreprise</h1>
          <p className="text-sm text-gray-500">Profil affiché dans les exports et rapports</p>
        </div>
      </div>

      {msg && (
        <div className={msg.type === 'ok' ? 'db-alert-green' : 'db-alert-red'}>{msg.text}</div>
      )}

      <div className="db-panel space-y-5">
        {/* Logo */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Logo entreprise</label>
          {form.logo_url && (
            <img src={form.logo_url} alt="logo" className="mb-2 h-16 rounded border object-contain" />
          )}
          {isAdmin && (
            <div className="flex items-center gap-3">
              <label className="db-btn-secondary cursor-pointer">
                {uploading ? 'Upload…' : 'Choisir un fichier'}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
              </label>
              <span className="text-xs text-gray-400">JPG, PNG, SVG — max 2 Mo</span>
            </div>
          )}
        </div>

        {/* Nom */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nom de l'entreprise *</label>
          <input
            className="db-input"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            disabled={!isAdmin}
          />
        </div>

        {/* SIRET */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">SIRET</label>
          <input
            className="db-input"
            value={form.siret ?? ''}
            onChange={e => setForm(f => ({ ...f, siret: e.target.value }))}
            placeholder="12345678901234"
            maxLength={14}
            disabled={!isAdmin}
          />
        </div>

        {/* Secteur */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Secteur d'activité</label>
          <select
            className="db-input"
            value={form.secteur ?? ''}
            onChange={e => setForm(f => ({ ...f, secteur: e.target.value || null }))}
            disabled={!isAdmin}
          >
            <option value="">— Sélectionner —</option>
            {SECTEURS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Adresse */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Adresse</label>
          <textarea
            className="db-input"
            rows={2}
            value={form.adresse ?? ''}
            onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
            placeholder="12 rue de la Paix, 75001 Paris"
            disabled={!isAdmin}
          />
        </div>

        {/* Téléphone */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Téléphone</label>
          <input
            className="db-input"
            value={form.telephone ?? ''}
            onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
            placeholder="01 23 45 67 89"
            disabled={!isAdmin}
          />
        </div>

        {isAdmin && (
          <button className="db-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        )}
      </div>
    </div>
  );
}
