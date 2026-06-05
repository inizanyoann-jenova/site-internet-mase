// src/components/procedures/wizard/Step6Preview.tsx
import { useState } from 'react';
import type { WizardStepProps } from './ProcedureWizard';
import LogigrammePreview from '../shared/LogigrammePreview';

export default function Step6Preview({ state, onNext, onBack, isSaving }: WizardStepProps) {
  const [view, setView] = useState<'doc' | 'logi'>('doc');
  const [logiMode, setLogiMode] = useState<'flow' | 'swim'>('flow');

  const riskColor: Record<string, string> = { high: '#fef2f2', med: '#fffbeb', low: '#f0fdf4' };
  const riskBorder: Record<string, string> = { high: '#dc2626', med: '#d97706', low: '#059669' };
  const riskLabel: Record<string, string> = { high: '🔴 Élevé', med: '🟡 Moyen', low: '🟢 Faible' };

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Aperçu de la procédure</h2>
          <p className="text-sm text-gray-500">Vérifiez votre procédure avant l'export PDF.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button onClick={() => setView('doc')} className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${view === 'doc' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>📄 Document ISO</button>
            <button onClick={() => setView('logi')} className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${view === 'logi' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>🔀 Logigramme</button>
          </div>
          {view === 'logi' && (
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              <button onClick={() => setLogiMode('flow')} className={`rounded-md px-3 py-1 text-[10px] font-semibold transition ${logiMode === 'flow' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Organigramme</button>
              <button onClick={() => setLogiMode('swim')} className={`rounded-md px-3 py-1 text-[10px] font-semibold transition ${logiMode === 'swim' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Couloirs</button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-y-auto p-6" style={{ maxHeight: '65vh' }}>
        {view === 'doc' && (
          <div style={{ maxWidth: 740, margin: '0 auto', fontFamily: 'system-ui, sans-serif', fontSize: 12 }}>
            {/* En-tête ISO */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #0d2240', marginBottom: 20 }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #0d2240', padding: '10px 12px', width: '23%', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Arial,sans-serif' }}>
                      <strong style={{ color: '#e33512', fontSize: 22, fontStyle: 'italic', letterSpacing: -1, display: 'block' }}>MASE</strong>
                    </div>
                  </td>
                  <td style={{ border: '1px solid #0d2240', padding: '10px 12px', width: '50%', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0d2240', lineHeight: 1.3 }}>{state.title || 'Titre de la procédure'}</div>
                    <div style={{ fontSize: 9.5, color: '#6b849a', marginTop: 5, textTransform: 'uppercase' as const, fontWeight: 700 }}>PROCESSUS : {state.processParent || 'Non défini'}</div>
                  </td>
                  <td style={{ border: '1px solid #0d2240', padding: '10px 12px', width: '27%', fontSize: 10.5, lineHeight: 1.7 }}>
                    <div><strong style={{ color: '#0d2240' }}>Réf :</strong> <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{state.reference || 'PR-XXX'}</span></div>
                    <div><strong style={{ color: '#0d2240' }}>Version :</strong> {state.version}</div>
                    <div><strong style={{ color: '#0d2240' }}>Date :</strong> {state.documentDate}</div>
                    <div><strong style={{ color: '#0d2240' }}>Statut :</strong> <span style={{ textTransform: 'uppercase' as const, fontWeight: 700, color: '#0e8a7a' }}>{state.status}</span></div>
                  </td>
                </tr>
              </tbody>
            </table>

            {state.objective && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase' as const, color: '#1e5f8e', padding: '4px 8px', background: '#eef3f8', borderLeft: '3px solid #1e5f8e', marginBottom: 8 }}>🎯 Objectif</div>
                <div style={{ lineHeight: 1.6 }}>{state.objective}</div>
              </div>
            )}

            {(state.domain || state.responsible) && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase' as const, color: '#1e5f8e', padding: '4px 8px', background: '#eef3f8', borderLeft: '3px solid #1e5f8e', marginBottom: 8 }}>🔍 Domaine & Responsable</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #d0dce8', borderRadius: 3, overflow: 'hidden' }}>
                  {([['Domaine d\'application', state.domain], ['Responsable', state.responsible], ['Documents entrants', state.docsIn], ['Documents sortants', state.docsOut]] as [string, string][]).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} style={{ padding: '8px 10px', borderRight: '1px solid #d0dce8', borderBottom: '1px solid #d0dce8' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#6b849a', textTransform: 'uppercase' as const, marginBottom: 3 }}>{k}</div>
                      <div style={{ fontSize: 11 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {state.kpi && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase' as const, color: '#1e5f8e', padding: '4px 8px', background: '#eef3f8', borderLeft: '3px solid #1e5f8e', marginBottom: 8 }}>📊 KPI</div>
                <div style={{ lineHeight: 1.6 }}>{state.kpi}</div>
              </div>
            )}

            {state.risks.filter((r) => r.risque).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase' as const, color: '#1e5f8e', padding: '4px 8px', background: '#eef3f8', borderLeft: '3px solid #1e5f8e', marginBottom: 8 }}>⚠️ Risques</div>
                {state.risks.filter((r) => r.risque).map((r) => (
                  <div key={r.id} style={{ display: 'flex', gap: 8, padding: '8px 10px', background: riskColor[r.niveau] ?? '#f8fafc', borderLeft: `3px solid ${riskBorder[r.niveau] ?? '#94a3b8'}`, borderRadius: 4, marginBottom: 6, fontSize: 11 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 3, flexShrink: 0 }}>{riskLabel[r.niveau] ?? r.niveau}</span>
                    <div><strong>{r.risque}</strong>{r.controle && <span style={{ color: '#6b849a' }}> — {r.controle}</span>}</div>
                  </div>
                ))}
              </div>
            )}

            {state.approvers.filter((a) => a.nom).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase' as const, color: '#1e5f8e', padding: '4px 8px', background: '#eef3f8', borderLeft: '3px solid #1e5f8e', marginBottom: 8 }}>✍️ Approbation</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>{['Rôle', 'Nom & Fonction', 'Date', 'Signature'].map((h) => <th key={h} style={{ background: '#eef3f8', color: '#0d2240', padding: '6px 8px', textAlign: 'left', fontSize: 9.5, fontWeight: 800, border: '1px solid #d0dce8' }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {state.approvers.filter((a) => a.nom).map((a) => (
                      <tr key={a.id}>
                        <td style={{ padding: '8px', border: '1px solid #d0dce8' }}><strong>{a.role}</strong></td>
                        <td style={{ padding: '8px', border: '1px solid #d0dce8' }}>{a.nom}</td>
                        <td style={{ padding: '8px', border: '1px solid #d0dce8' }}>{a.date}</td>
                        <td style={{ padding: '8px', border: '1px solid #d0dce8', minHeight: 36 }}></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {view === 'logi' && (
          <LogigrammePreview steps={state.steps} isSwim={logiMode === 'swim'} showSizeControls />
        )}
      </div>

      <div className="flex justify-between border-t border-gray-100 bg-white px-6 py-4">
        <button onClick={onBack} className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50">← Retour</button>
        <button onClick={() => onNext()} disabled={isSaving}
          className="rounded-xl px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}>
          {isSaving ? 'Sauvegarde…' : '🎉 Finaliser et exporter →'}
        </button>
      </div>
    </div>
  );
}
