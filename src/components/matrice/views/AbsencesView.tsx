// src/components/matrice/views/AbsencesView.tsx
import { useState } from 'react';
import { useMatrice } from '../MatriceContext';
import { getCoverageAlerts } from '../matrice.utils';

const ABSENCE_REASONS = ['Arrêt maladie', 'Congés payés', 'Formation', 'Accident du travail', 'Autre'];

export function AbsencesView() {
  const { data, dispatch } = useMatrice();
  const [modal, setModal] = useState<{ employeeId: string } | null>(null);
  const [reason, setReason] = useState('');

  const absentEmps = data.employees.filter(e => e.isAbsent);
  const presentEmps = data.employees.filter(e => !e.isAbsent);
  const alerts = getCoverageAlerts(data.comps, data.employees);

  function declareAbsent(employeeId: string) {
    setReason('');
    setModal({ employeeId });
  }

  function confirmAbsence() {
    if (!modal) return;
    dispatch({ type: 'TOGGLE_ABSENCE', employeeId: modal.employeeId, isAbsent: true, reason });
    setModal(null);
  }

  function returnEmployee(employeeId: string) {
    dispatch({ type: 'TOGGLE_ABSENCE', employeeId, isAbsent: false, reason: '' });
  }

  return (
    <div className="space-y-5">
      {/* Alertes */}
      {alerts.length > 0 && (
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <div className="border-b px-5 py-4 font-bold text-slate-800">⚠️ Alertes de couverture ({alerts.length})</div>
          <div className="divide-y">
            {alerts.map(alert => (
              <div key={alert.comp.id} className="flex items-start gap-3 px-5 py-4">
                <span className="mt-0.5 text-lg">{alert.status === 'critical' ? '🔴' : '🟠'}</span>
                <div>
                  <div className="font-semibold text-slate-800">
                    {alert.comp.name}
                    <span
                      className="ml-2 rounded-full px-2 py-0.5 text-xs font-bold"
                      style={{ background: alert.status === 'critical' ? '#fee2e2' : '#fef9c3', color: alert.status === 'critical' ? '#c0392b' : '#92400e' }}
                    >
                      {alert.status === 'critical' ? 'CRITIQUE' : 'ATTENTION'}
                    </span>
                  </div>
                  <div className="mt-0.5 text-sm text-slate-500">{alert.reason}</div>
                  {alert.availableEmployees.length > 0 && (
                    <div className="mt-1 text-xs text-slate-400">
                      Disponibles : {alert.availableEmployees.map(e => e.name).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {alerts.length === 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-800">
          ✅ Tous les postes clés sont couverts.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Absents */}
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <div className="border-b px-5 py-4 font-bold text-slate-800">
            Absences en cours
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{absentEmps.length}</span>
          </div>
          {absentEmps.length === 0
            ? <p className="p-5 text-sm text-slate-400">Aucune absence en cours.</p>
            : absentEmps.map(emp => (
              <div key={emp.id} className="flex items-center justify-between border-b px-5 py-3 last:border-0">
                <div>
                  <div className="font-semibold text-slate-800">{emp.name}</div>
                  <div className="text-xs text-slate-400">{emp.absenceReason || 'Motif non précisé'} — {emp.role}</div>
                </div>
                <button
                  onClick={() => returnEmployee(emp.id)}
                  className="rounded px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 border border-green-200"
                >
                  Retour
                </button>
              </div>
            ))}
        </div>

        {/* Présents */}
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <div className="border-b px-5 py-4 font-bold text-slate-800">Salariés présents</div>
          {presentEmps.length === 0
            ? <p className="p-5 text-sm text-slate-400">Tous les salariés sont absents.</p>
            : presentEmps.map(emp => (
              <div key={emp.id} className="flex items-center justify-between border-b px-5 py-3 last:border-0">
                <div>
                  <div className="font-semibold text-slate-800">{emp.name}</div>
                  <div className="text-xs text-slate-400">{emp.role}</div>
                </div>
                <button
                  onClick={() => declareAbsent(emp.id)}
                  className="rounded px-3 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-50 border border-orange-200"
                >
                  Déclarer absent
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Modal motif */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 font-bold text-slate-800">Déclarer une absence</h3>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Motif de l'absence</label>
            <select
              className="mb-5 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400"
              value={reason}
              onChange={e => setReason(e.target.value)}
            >
              <option value="">Sélectionner…</option>
              {ABSENCE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-sm text-slate-500 hover:bg-slate-50">Annuler</button>
              <button
                onClick={confirmAbsence}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ background: '#e67e22' }}
              >
                Déclarer absent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
