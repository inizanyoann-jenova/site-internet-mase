// src/dashboard/JournalAudit.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface AuditEntry {
  id: string;
  table_name: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string | null;
  user_email: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

const TABLE_LABELS: Record<string, string> = {
  risques: 'DUERP',
  actions: "Plan d'actions",
  accidents: 'Accidents',
  habilitations: 'Habilitations',
  kpi_objectifs: 'KPIs',
  objectifs_qhse: 'Objectifs QHSE',
  reunions_qhse: 'Réunions',
  qualite_audits: 'Audits',
  qualite_nc: 'Non-conformités',
  rh_employes: 'Employés',
  rh_formations: 'Formations',
};

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
};

const PAGE_SIZE = 50;

interface Props {
  companyId: string;
}

export default function JournalAudit({ companyId }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filterTable, setFilterTable] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (filterTable) q = q.eq('table_name', filterTable);
    if (filterAction) q = q.eq('action', filterAction);
    const { data, count } = await q;
    setEntries((data ?? []) as AuditEntry[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [companyId, page, filterTable, filterAction]);

  useEffect(() => { load(); }, [load]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function getSummary(entry: AuditEntry): string {
    const data = entry.new_data ?? entry.old_data;
    if (!data) return '';
    const candidates = ['danger', 'action', 'employe', 'titre', 'nom', 'name'];
    for (const k of candidates) {
      if (data[k]) return String(data[k]).slice(0, 60);
    }
    return entry.record_id?.slice(0, 8) ?? '';
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4 p-6">
      <div className="db-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Journal d'audit</h1>
          <p className="text-sm text-gray-500">Traçabilité de toutes les modifications — lecture seule</p>
        </div>
        <div className="db-kpi">
          <div className="text-2xl font-bold text-gray-900">{total}</div>
          <div className="text-xs text-gray-500">entrées</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <select
          className="db-input w-auto"
          value={filterTable}
          onChange={e => { setFilterTable(e.target.value); setPage(0); }}
        >
          <option value="">Tous les modules</option>
          {Object.entries(TABLE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          className="db-input w-auto"
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value); setPage(0); }}
        >
          <option value="">Toutes les actions</option>
          <option value="INSERT">Création</option>
          <option value="UPDATE">Modification</option>
          <option value="DELETE">Suppression</option>
        </select>
      </div>

      {/* Table */}
      <div className="db-panel overflow-x-auto p-0">
        {loading ? (
          <div className="p-6 text-center text-gray-400">Chargement…</div>
        ) : entries.length === 0 ? (
          <div className="p-6 text-center text-gray-400">Aucune entrée pour ces filtres.</div>
        ) : (
          <table className="db-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Module</th>
                <th>Action</th>
                <th>Résumé</th>
                <th>Utilisateur</th>
                <th>Détail</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <React.Fragment key={e.id}>
                  <tr>
                    <td className="whitespace-nowrap text-xs text-gray-500">{formatDate(e.created_at)}</td>
                    <td className="text-sm">{TABLE_LABELS[e.table_name] ?? e.table_name}</td>
                    <td>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[e.action]}`}>
                        {e.action === 'INSERT' ? 'Création' : e.action === 'UPDATE' ? 'Modification' : 'Suppression'}
                      </span>
                    </td>
                    <td className="max-w-xs truncate text-sm text-gray-700">{getSummary(e)}</td>
                    <td className="text-xs text-gray-500">{e.user_email ?? '—'}</td>
                    <td>
                      <button
                        className="text-xs text-blue-600 hover:underline"
                        onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                      >
                        {expanded === e.id ? 'Masquer' : 'Voir'}
                      </button>
                    </td>
                  </tr>
                  {expanded === e.id && (
                    <tr>
                      <td colSpan={6} className="bg-gray-50 p-3">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          {e.old_data && (
                            <div>
                              <div className="mb-1 font-semibold text-gray-500">Avant</div>
                              <pre className="overflow-auto rounded bg-white p-2 text-gray-600">
                                {JSON.stringify(e.old_data, null, 2)}
                              </pre>
                            </div>
                          )}
                          {e.new_data && (
                            <div>
                              <div className="mb-1 font-semibold text-gray-500">Après</div>
                              <pre className="overflow-auto rounded bg-white p-2 text-gray-600">
                                {JSON.stringify(e.new_data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Page {page + 1} / {totalPages}</span>
          <div className="flex gap-2">
            <button className="db-btn-secondary" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
              ← Précédent
            </button>
            <button className="db-btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
              Suivant →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
