// src/components/matrice/views/ParametresView.tsx
import { useRef } from 'react';
import { useMatrice } from '../MatriceContext';
import type { MatriceData } from '../types';

export function ParametresView() {
  const { data, dispatch } = useMatrice();
  const fileRef = useRef<HTMLInputElement>(null);

  function exportJSON() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matrice-${data.config.company.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as MatriceData;
        if (!parsed.config || !parsed.comps || !parsed.employees) throw new Error('Format invalide');
        dispatch({ type: 'SET_DATA', data: parsed });
        alert('Données importées avec succès.');
      } catch {
        alert('Fichier JSON invalide.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function resetToDemo() {
    if (!confirm('Réinitialiser avec les données de démonstration ? Toutes vos données seront perdues.')) return;
    import('../demoData').then(({ DEMO_DATA }) => {
      dispatch({ type: 'SET_DATA', data: DEMO_DATA });
    });
  }

  return (
    <div className="max-w-xl space-y-6">
      {/* Infos entreprise */}
      <div className="rounded-lg bg-white shadow p-6">
        <h3 className="mb-4 font-bold text-slate-800">Informations du document</h3>
        <label className="mb-1 block text-xs font-semibold text-slate-600">Nom de l'entreprise</label>
        <input
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400"
          value={data.config.company}
          onChange={e => dispatch({ type: 'UPDATE_CONFIG', config: { company: e.target.value } })}
          placeholder="Mon Entreprise"
        />
        <label className="mb-1 block text-xs font-semibold text-slate-600">Titre du document</label>
        <input
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400"
          value={data.config.docTitle}
          onChange={e => dispatch({ type: 'UPDATE_CONFIG', config: { docTitle: e.target.value } })}
          placeholder="Matrice de Polyvalence 2025"
        />
      </div>

      {/* Sauvegarde JSON */}
      <div className="rounded-lg bg-white shadow p-6">
        <h3 className="mb-1 font-bold text-slate-800">Sauvegarde locale (optionnel)</h3>
        <p className="mb-4 text-xs text-slate-400">Vos données sont automatiquement sauvegardées dans le cloud. Ces options permettent une copie locale.</p>
        <div className="flex gap-3">
          <button
            onClick={exportJSON}
            className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            📥 Exporter JSON
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            📤 Importer JSON
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={importJSON} />
        </div>
      </div>

      {/* Zone danger */}
      <div className="rounded-lg border-2 border-red-300 bg-red-50 p-6">
        <h3 className="mb-1 font-bold text-red-700">Zone de danger</h3>
        <p className="mb-4 text-xs text-red-600">Cette action est irréversible. Toutes vos données seront remplacées par les données de démonstration.</p>
        <button
          onClick={resetToDemo}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: '#c0392b' }}
        >
          Réinitialiser avec les données de démo
        </button>
      </div>
    </div>
  );
}
