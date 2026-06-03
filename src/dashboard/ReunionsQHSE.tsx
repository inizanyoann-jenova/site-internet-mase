// src/dashboard/ReunionsQHSE.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, RefreshCw, MessageSquare, ChevronDown, ChevronRight, Printer, Save, Send, X, MapPin, User, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props { companyId: string; canWrite: boolean; }

interface ActionReu { id: number; description: string; responsable: string; echeance: string; statut: string; }

interface Reunion {
  id: string;
  date: string;
  type: string;
  lieu: string | null;
  animateur: string | null;
  participants: string | null;
  ordre_du_jour: string | null;
  decisions: string | null;
  statut: string;
  actions_json: string;
}

const TYPES = ['Réunion Sécurité', 'Comité QSE', 'Revue de Direction', 'CSSCT / CSE', 'Réunion Qualité', 'Réunion Mensuelle QHSE', 'Autre'];
const STATUTS = ['Planifiée', 'Terminée', 'Annulée'];
const STATUT_COLOR: Record<string, { color: string; bg: string; border: string }> = {
  'Planifiée': { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)'  },
  'Terminée':  { color: '#10B981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)'  },
  'Annulée':   { color: '#94A3B8', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)' },
};

const FORM_INIT = { date: new Date().toISOString().split('T')[0], type: TYPES[0], lieu: '', animateur: '', participants: '', ordre_du_jour: '', decisions: '', statut: 'Planifiée' };
const ACT_INIT: Omit<ActionReu, 'id'> = { description: '', responsable: '', echeance: '', statut: 'À lancer' };

const inp = { padding: '7px 10px', fontSize: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, color: '#0f172a', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' as const };
const lbl = { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', display: 'block', marginBottom: 4 };

export default function ReunionsQHSE({ companyId, canWrite }: Props) {
  const [reunions, setReunions]   = useState<Reunion[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ ...FORM_INIT });
  const [saving, setSaving]       = useState<string | null>(null);
  const [filtreStatut, setFS]     = useState('Tous');
  const [filtreType, setFT]       = useState('Tous');
  const [actionsMap, setActionsMap] = useState<Record<string, ActionReu[]>>({});
  const [newAct, setNewAct]       = useState<Record<string, typeof ACT_INIT>>({});

  async function fetchReunions() {
    setLoading(true);
    const { data } = await supabase.from('reunions_qhse').select('*').order('date', { ascending: false });
    if (data) {
      setReunions(data);
      const m: Record<string, ActionReu[]> = {};
      data.forEach(r => { try { m[r.id] = JSON.parse(r.actions_json); } catch { m[r.id] = []; } });
      setActionsMap(m);
    }
    setLoading(false);
  }
  useEffect(() => { fetchReunions(); }, []);

  const ajouter = async () => {
    if (!form.date) return;
    const { data } = await supabase.from('reunions_qhse').insert([{ ...form, company_id: companyId, actions_json: '[]' }]).select();
    if (data) {
      setReunions(p => [data[0], ...p]);
      setActionsMap(p => ({ ...p, [data[0].id]: [] }));
    }
    setShowForm(false);
    setForm({ ...FORM_INIT });
  };

  const saveRow = async (row: Reunion) => {
    setSaving(row.id);
    const { id, ...d } = row;
    await supabase.from('reunions_qhse').update(d).eq('id', id);
    setSaving(null);
  };

  const upRow = (id: string, k: keyof Reunion, v: unknown) =>
    setReunions(p => p.map(r => r.id === id ? { ...r, [k]: v } : r));

  const delRow = async (id: string) => {
    if (!confirm('Supprimer cette réunion ?')) return;
    await supabase.from('reunions_qhse').delete().eq('id', id);
    setReunions(p => p.filter(r => r.id !== id));
  };

  const saveActions = async (reunionId: string, list: ActionReu[]) => {
    await supabase.from('reunions_qhse').update({ actions_json: JSON.stringify(list) }).eq('id', reunionId);
    setActionsMap(p => ({ ...p, [reunionId]: list }));
  };

  const addAction = async (reunionId: string) => {
    const a = newAct[reunionId] ?? { ...ACT_INIT };
    if (!a.description.trim()) return;
    const list = [...(actionsMap[reunionId] ?? []), { ...a, id: Date.now() }];
    await saveActions(reunionId, list);
    setNewAct(p => ({ ...p, [reunionId]: { ...ACT_INIT } }));
  };

  const removeAction = async (reunionId: string, actId: number) => {
    const list = (actionsMap[reunionId] ?? []).filter(a => a.id !== actId);
    await saveActions(reunionId, list);
  };

  const envoyerPDCA = async (reunionId: string) => {
    const reunion = reunions.find(r => r.id === reunionId);
    const acts = (actionsMap[reunionId] ?? []).filter(a => a.description.trim());
    if (!acts.length) { alert('Aucune action à envoyer.'); return; }
    await supabase.from('actions').insert(
      acts.map(a => ({
        company_id: companyId,
        origine: 'Réunion QHSE',
        reference_source: `Réunion ${reunion?.type ?? ''} du ${reunion?.date ?? ''}`,
        domaine: 'Qualité',
        type_action: 'Corrective',
        action: a.description,
        pilote: a.responsable || '',
        echeance: a.echeance || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        statut: 'À lancer',
        avancement_pct: 0,
        priorite: '🟡 Normale',
        resultat_efficacite: 'Non évalué',
        commentaire: `Générée depuis réunion "${reunion?.type}" du ${reunion?.date}`,
      }))
    );
    alert(`✅ ${acts.length} action(s) envoyée(s) au Plan d'Actions`);
  };

  const imprimerPV = (r: Reunion) => {
    const acts = actionsMap[r.id] ?? [];
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>PV — ${r.type} — ${r.date}</title>
<style>body{font-family:Arial,sans-serif;margin:40px;color:#1e293b;line-height:1.5}h1{font-size:20px;border-bottom:3px solid #166534;padding-bottom:8px}h2{font-size:14px;color:#166534;margin-top:24px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0;padding:16px;background:#f8fafc;border-radius:8px}.meta div{font-size:12px}.meta strong{color:#64748b;display:block;font-size:10px;text-transform:uppercase}pre{white-space:pre-wrap;font-family:Arial;font-size:13px;margin:0}table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}th{background:#166534;color:white;padding:8px 10px;text-align:left;font-size:11px}td{padding:7px 10px;border-bottom:1px solid #e2e8f0}.footer{margin-top:40px;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between}.sig{margin-top:60px;font-size:12px}@media print{body{margin:20px}}</style>
</head><body>
<h1>Procès-Verbal de Réunion</h1>
<div class="meta">
  <div><strong>Type</strong>${r.type}</div>
  <div><strong>Date</strong>${new Date(r.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
  <div><strong>Lieu</strong>${r.lieu || '—'}</div>
  <div><strong>Animateur</strong>${r.animateur || '—'}</div>
  <div><strong>Statut</strong>${r.statut}</div>
  <div><strong>Participants</strong>${r.participants || '—'}</div>
</div>
<h2>Ordre du jour</h2><pre>${r.ordre_du_jour || 'Non renseigné'}</pre>
<h2>Décisions &amp; Compte-rendu</h2><pre>${r.decisions || 'Non renseigné'}</pre>
${acts.length > 0 ? `<h2>Actions générées (${acts.length})</h2><table><thead><tr><th>#</th><th>Description</th><th>Responsable</th><th>Échéance</th><th>Statut</th></tr></thead><tbody>${acts.map((a, i) => `<tr><td>${i + 1}</td><td>${a.description}</td><td>${a.responsable || '—'}</td><td>${a.echeance || '—'}</td><td>${a.statut}</td></tr>`).join('')}</tbody></table>` : ''}
<div class="footer"><span>Généré le ${new Date().toLocaleDateString('fr-FR')} — SMI Dashboard</span><span>${r.type} — ${r.date}</span></div>
<div class="sig"><p>Signature de l'animateur : ___________________________</p><p>Date de validation : ___________________________</p></div>
</body></html>`;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { alert('Popup bloquée. Autorisez les popups.'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  const filtrees = useMemo(() => reunions.filter(r => {
    if (filtreStatut !== 'Tous' && r.statut !== filtreStatut) return false;
    if (filtreType !== 'Tous' && r.type !== filtreType) return false;
    return true;
  }), [reunions, filtreStatut, filtreType]);

  const types = useMemo(() => ['Tous', ...[...new Set(reunions.map(r => r.type).filter(Boolean))].sort()], [reunions]);

  const kpis = useMemo(() => ({
    total:     reunions.length,
    terminees: reunions.filter(r => r.statut === 'Terminée').length,
    planifiees: reunions.filter(r => r.statut === 'Planifiée').length,
    actions:   Object.values(actionsMap).reduce((s, a) => s + a.length, 0),
  }), [reunions, actionsMap]);

  return (
    <div className="space-y-5 pb-10">
      <div className="db-page-header">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--mase-heading)]">
            <MessageSquare size={22} className="text-blue-500" /> Réunions QHSE
          </h2>
          <p className="text-sm text-[var(--mase-muted)] mt-1">Suivi, décisions, actions — Génération PV PDF</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchReunions} className="db-btn-secondary"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser</button>
          {canWrite && <button onClick={() => setShowForm(true)} className="db-btn-primary"><Plus size={14} /> Nouvelle réunion</button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Réunions',     val: kpis.total,      color: '#3b82f6' },
          { label: 'Terminées',    val: kpis.terminees,  color: '#10b981' },
          { label: 'Planifiées',   val: kpis.planifiees, color: '#f59e0b' },
          { label: 'Actions PDCA', val: kpis.actions,    color: '#8b5cf6' },
        ].map((k, i) => (
          <div key={i} className="db-panel p-4" style={{ borderLeft: `4px solid ${k.color}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a' }}>{k.val}</div>
          </div>
        ))}
      </div>

      <div className="db-panel p-3" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filtreStatut} onChange={e => setFS(e.target.value)} style={{ ...inp, width: 140 }}>
          {['Tous', ...STATUTS].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filtreType} onChange={e => setFT(e.target.value)} style={{ ...inp, width: 200 }}>
          {types.map(t => <option key={t}>{t}</option>)}
        </select>
        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>{filtrees.length} réunion{filtrees.length > 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="db-panel p-10 text-center text-[var(--mase-muted)]"><RefreshCw size={24} className="animate-spin mx-auto mb-2" /></div>
      ) : filtrees.length === 0 ? (
        <div className="db-panel p-10 text-center" style={{ color: '#64748b' }}>
          <MessageSquare size={36} className="mx-auto mb-3 opacity-30" />
          <p>Aucune réunion enregistrée</p>
          {canWrite && <button onClick={() => setShowForm(true)} className="db-btn-primary mt-4"><Plus size={14} /> Créer la première</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtrees.map(r => {
            const st = STATUT_COLOR[r.statut] ?? STATUT_COLOR['Planifiée'];
            const isOpen = expanded === r.id;
            const aList = actionsMap[r.id] ?? [];
            const nAct = newAct[r.id] ?? { ...ACT_INIT };

            return (
              <div key={r.id} className="db-panel" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : r.id)}>
                  {isOpen ? <ChevronDown size={16} style={{ color: '#94a3b8', flexShrink: 0 }} /> : <ChevronRight size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />}
                  <div style={{ textAlign: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '5px 10px', flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                      {new Date(r.date + 'T00:00:00').getDate().toString().padStart(2, '0')}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                      {new Date(r.date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' })}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{r.type}</span>
                      <span style={{ fontSize: 11, color: st.color, background: st.bg, border: `1px solid ${st.border}`, borderRadius: 100, padding: '1px 8px', fontWeight: 700 }}>{r.statut}</span>
                      {aList.length > 0 && <span style={{ fontSize: 11, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 100, padding: '1px 8px', fontWeight: 700 }}>{aList.length} action{aList.length > 1 ? 's' : ''}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 3, flexWrap: 'wrap' }}>
                      {r.lieu && <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={10} />{r.lieu}</span>}
                      {r.animateur && <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}><User size={10} />{r.animateur}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => imprimerPV(r)} title="PV PDF" style={{ padding: '5px 7px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', display: 'flex' }}><Printer size={13} /></button>
                    <button onClick={() => saveRow(r)} title="Sauvegarder" style={{ padding: '5px 7px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', color: '#3b82f6', display: 'flex' }}>
                      {saving === r.id ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                    </button>
                    {canWrite && <button onClick={() => delRow(r.id)} style={{ padding: '5px 7px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, cursor: 'pointer', color: '#ef4444', display: 'flex' }}><Trash2 size={13} /></button>}
                  </div>
                </div>

                {isOpen && (
                  <div style={{ borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                      <div><label style={lbl}>Date</label><input type="date" value={r.date} onChange={e => upRow(r.id, 'date', e.target.value)} onBlur={() => saveRow(r)} style={inp} /></div>
                      <div><label style={lbl}>Type</label><select value={r.type} onChange={e => upRow(r.id, 'type', e.target.value)} onBlur={() => saveRow(r)} style={inp}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                      <div><label style={lbl}>Statut</label>
                        <select value={r.statut} onChange={e => { upRow(r.id, 'statut', e.target.value); setTimeout(() => saveRow({ ...r, statut: e.target.value }), 100); }} style={{ ...inp, color: st.color, fontWeight: 700, background: st.bg, borderColor: st.border }}>
                          {STATUTS.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <div><label style={lbl}>Lieu</label><input value={r.lieu ?? ''} onChange={e => upRow(r.id, 'lieu', e.target.value)} onBlur={() => saveRow(r)} style={inp} placeholder="Salle de réunion" /></div>
                      <div><label style={lbl}>Animateur</label><input value={r.animateur ?? ''} onChange={e => upRow(r.id, 'animateur', e.target.value)} onBlur={() => saveRow(r)} style={inp} placeholder="Responsable" /></div>
                      <div><label style={lbl}>Participants</label><input value={r.participants ?? ''} onChange={e => upRow(r.id, 'participants', e.target.value)} onBlur={() => saveRow(r)} style={inp} placeholder="Noms, virgule" /></div>
                      <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Ordre du jour</label><textarea value={r.ordre_du_jour ?? ''} onChange={e => upRow(r.id, 'ordre_du_jour', e.target.value)} onBlur={() => saveRow(r)} style={{ ...inp, minHeight: 60, resize: 'vertical' }} placeholder="Points abordés..." /></div>
                      <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Décisions &amp; Compte-rendu</label><textarea value={r.decisions ?? ''} onChange={e => upRow(r.id, 'decisions', e.target.value)} onBlur={() => saveRow(r)} style={{ ...inp, minHeight: 80, resize: 'vertical' }} placeholder="Décisions prises..." /></div>
                    </div>

                    <div style={{ padding: '0 18px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <CheckCircle size={13} className="text-blue-500" /> Actions ({aList.length})
                        </span>
                        {aList.length > 0 && canWrite && (
                          <button onClick={() => envoyerPDCA(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            <Send size={11} /> Envoyer au Plan d'Actions
                          </button>
                        )}
                      </div>
                      {aList.length > 0 && (
                        <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {aList.map(a => (
                            <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 110px auto', gap: 8, alignItems: 'center', padding: '6px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7 }}>
                              <span style={{ fontSize: 12, color: '#334155' }}>{a.description}</span>
                              <span style={{ fontSize: 11, color: '#64748b' }}>{a.responsable || '—'}</span>
                              <span style={{ fontSize: 11, color: '#64748b' }}>{a.echeance || '—'}</span>
                              {canWrite && <button onClick={() => removeAction(r.id, a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex' }}><X size={12} /></button>}
                            </div>
                          ))}
                        </div>
                      )}
                      {canWrite && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 120px auto', gap: 6, alignItems: 'end' }}>
                          <div>
                            <label style={lbl}>Nouvelle action</label>
                            <input value={nAct.description} onChange={e => setNewAct(p => ({ ...p, [r.id]: { ...(p[r.id] ?? ACT_INIT), description: e.target.value } }))} placeholder="Description..." style={inp} />
                          </div>
                          <div>
                            <label style={lbl}>Responsable</label>
                            <input value={nAct.responsable} onChange={e => setNewAct(p => ({ ...p, [r.id]: { ...(p[r.id] ?? ACT_INIT), responsable: e.target.value } }))} placeholder="Nom" style={inp} />
                          </div>
                          <div>
                            <label style={lbl}>Échéance</label>
                            <input type="date" value={nAct.echeance} onChange={e => setNewAct(p => ({ ...p, [r.id]: { ...(p[r.id] ?? ACT_INIT), echeance: e.target.value } }))} style={inp} />
                          </div>
                          <button onClick={() => addAction(r.id)} style={{ height: 34, padding: '0 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                            <Plus size={13} /> Ajouter
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, width: '100%', maxWidth: 600, boxShadow: '0 24px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Nouvelle réunion QHSE</span>
              <button onClick={() => setShowForm(false)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', padding: '4px 6px', display: 'flex' }}><X size={14} /></button>
            </div>
            <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label style={lbl}>Date *</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inp} /></div>
              <div><label style={lbl}>Type</label><select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inp}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label style={lbl}>Lieu</label><input value={form.lieu} onChange={e => setForm(f => ({ ...f, lieu: e.target.value }))} style={inp} placeholder="Salle de réunion" /></div>
              <div><label style={lbl}>Animateur</label><input value={form.animateur} onChange={e => setForm(f => ({ ...f, animateur: e.target.value }))} style={inp} placeholder="Responsable" /></div>
              <div><label style={lbl}>Statut</label><select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))} style={inp}>{STATUTS.map(s => <option key={s}>{s}</option>)}</select></div>
              <div><label style={lbl}>Participants</label><input value={form.participants} onChange={e => setForm(f => ({ ...f, participants: e.target.value }))} style={inp} placeholder="Noms, virgule" /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Ordre du jour</label><textarea value={form.ordre_du_jour} onChange={e => setForm(f => ({ ...f, ordre_du_jour: e.target.value }))} style={{ ...inp, minHeight: 55, resize: 'vertical' }} placeholder="Points à aborder..." /></div>
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button onClick={() => setShowForm(false)} className="db-btn-secondary">Annuler</button>
              <button onClick={ajouter} className="db-btn-primary"><Plus size={13} /> Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
