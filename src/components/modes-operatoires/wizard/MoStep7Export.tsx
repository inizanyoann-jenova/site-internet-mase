import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MoWizardStepProps } from './MoWizard';
import { downloadMoPdf } from '../../../engine/modesOperatoires/renderMoPdf';
import LogiTechnicienPreview from '../shared/LogiTechnicienPreview';
import { buildLogiTechnicienSVG } from '../../../engine/modesOperatoires/buildLogiTechnicienSVG';
import { OPERATION_TYPE_LABELS, OPERATION_TYPE_ICONS } from '../../../types/modesOperatoires';

export default function MoStep7Export({ state, update: _update, onNext, onBack, isSaving }: MoWizardStepProps) {
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<'doc' | 'logi'>('doc');
  const navigate = useNavigate();

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadMoPdf({
        ...state,
        id: state.savedDocId,
        documentDate: state.documentDate || new Date().toISOString().split('T')[0],
      });
    } catch (e) {
      console.error('PDF error:', e);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadSvg = () => {
    const svg = buildLogiTechnicienSVG(state.phases.preparation, state.phases.execution, state.phases.finTache);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${state.reference ?? 'MO'}_logigramme.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleTerrainMode = () => {
    if (state.savedDocId) navigate(`/modes-operatoires/${state.savedDocId}/terrain`);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8">
      <h2 className="mb-2 text-xl font-black text-gray-900">Étape 7 — Aperçu & Export</h2>
      <p className="mb-6 text-sm text-gray-400">Vérifiez votre mode opératoire avant de le télécharger.</p>

      {/* Résumé */}
      <div className="mb-6 rounded-xl bg-gray-50 border border-gray-200 p-5">
        <div className="flex items-start gap-4">
          <span className="text-3xl">{OPERATION_TYPE_ICONS[state.operationType] ?? '📋'}</span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 text-lg">{state.title || 'Sans titre'}</div>
            <div className="text-sm text-gray-400">{OPERATION_TYPE_LABELS[state.operationType]} · {state.reference} · {state.version}</div>
            <div className="mt-3 grid grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-2.5 text-center">
                <div className="font-bold text-blue-700 text-base">{state.epis.length}</div>
                <div className="text-blue-500">EPI</div>
              </div>
              <div className="rounded-lg bg-yellow-50 border border-yellow-100 p-2.5 text-center">
                <div className="font-bold text-yellow-700 text-base">{state.phases.preparation.length + state.phases.execution.length + state.phases.finTache.length}</div>
                <div className="text-yellow-600">Étapes</div>
              </div>
              <div className="rounded-lg bg-red-50 border border-red-100 p-2.5 text-center">
                <div className="font-bold text-red-700 text-base">{state.urgences.length}</div>
                <div className="text-red-500">Urgences</div>
              </div>
              <div className="rounded-lg bg-green-50 border border-green-100 p-2.5 text-center">
                <div className="font-bold text-green-700 text-base">{state.habilitations.length}</div>
                <div className="text-green-600">Habilitations</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Onglets aperçu */}
      <div className="mb-4 flex gap-1 rounded-xl border border-gray-100 bg-gray-50 p-1">
        <button
          onClick={() => setActiveTab('doc')}
          className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition ${activeTab === 'doc' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}
        >
          Document PDF
        </button>
        <button
          onClick={() => setActiveTab('logi')}
          className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition ${activeTab === 'logi' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}
        >
          Logigramme terrain
        </button>
      </div>

      {activeTab === 'doc' && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500 italic text-center">
          Aperçu PDF disponible après téléchargement
        </div>
      )}

      {activeTab === 'logi' && (
        <div className="mb-6">
          <LogiTechnicienPreview
            preparation={state.phases.preparation}
            execution={state.phases.execution}
            finTache={state.phases.finTache}
            className="max-h-80"
          />
          <div className="mt-3 flex gap-3">
            <button
              onClick={handleDownloadSvg}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:border-gray-300"
            >
              ↓ Télécharger SVG
            </button>
            {state.savedDocId && (
              <button
                onClick={handleTerrainMode}
                className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100"
              >
                📱 Mode terrain →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Actions export */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="flex-1 rounded-2xl py-3 font-bold text-white shadow transition hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {downloading ? '⏳ Génération…' : '↓ Télécharger PDF A4'}
        </button>
        {state.savedDocId && (
          <button
            onClick={handleTerrainMode}
            className="rounded-2xl border-2 border-orange-300 px-6 py-3 font-bold text-orange-700 transition hover:bg-orange-50"
          >
            📱 Ouvrir en mode terrain
          </button>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 hover:border-gray-300">← Précédent</button>
        <button
          onClick={() => onNext()}
          disabled={isSaving}
          className="rounded-2xl px-8 py-3 font-bold text-white shadow transition hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}
        >
          {isSaving ? 'Sauvegarde…' : 'Terminer ✓'}
        </button>
      </div>
    </div>
  );
}
