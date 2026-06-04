// src/dashboard/EnvironnementSuivi.tsx
import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { safeNumber } from './kpi-utils';

type FluxType = 'energie_kwh' | 'eau_m3' | 'dechets_kg' | 'co2_kg' | 'autre';

interface FluxRow {
  id: string;
  annee: number;
  mois: number;
  type_flux: FluxType;
  valeur: number;
  commentaire: string | null;
}

interface ObjRow {
  type_flux: string;
  cible_annuelle: number | null;
}

const FLUX_CONFIG: Record<FluxType, { label: string; unite: string; color: string }> = {
  energie_kwh: { label: 'Énergie', unite: 'kWh', color: '#f59e0b' },
  eau_m3:      { label: 'Eau', unite: 'm³', color: '#3b82f6' },
  dechets_kg:  { label: 'Déchets', unite: 'kg', color: '#10b981' },
  co2_kg:      { label: 'CO₂', unite: 'kg', color: '#6b7280' },
  autre:       { label: 'Autre', unite: '', color: '#8b5cf6' },
};

const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

interface Props {
  companyId: string;
  canWrite: boolean;
}

export default function EnvironnementSuivi({ companyId, canWrite }: Props) {
  const currentYear = new Date().getFullYear();
  const [annee, setAnnee] = useState(currentYear);
  const [flux, setFlux] = useState<FluxRow[]>([]);
  const [objectifs, setObjectifs] = useState<ObjRow[]>([]);
  const [activeFlux, setActiveFlux] = useState<FluxType>('energie_kwh');
  const [editCell, setEditCell] = useState<{ mois: number; type: FluxType } | null>(null);
  const [editVal, setEditVal] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [{ data: f }, { data: o }] = await Promise.all([
      supabase.from('flux_environnement').select('*').eq('company_id', companyId).eq('annee', annee),
      supabase.from('objectifs_environnement').select('*').eq('company_id', companyId).eq('annee', annee),
    ]);
    setFlux((f ?? []) as FluxRow[]);
    setObjectifs((o ?? []) as ObjRow[]);
  }, [companyId, annee]);

  useEffect(() => { load(); }, [load]);

  function getValue(mois: number, type: FluxType): number {
    return safeNumber(flux.find(f => f.mois === mois && f.type_flux === type)?.valeur, 0);
  }

  function getTotal(type: FluxType): number {
    return flux.filter(f => f.type_flux === type).reduce((s, f) => s + safeNumber(f.valeur, 0), 0);
  }

  function getObjectif(type: FluxType): number | null {
    return objectifs.find(o => o.type_flux === type)?.cible_annuelle ?? null;
  }

  async function saveCell() {
    if (!editCell) return;
    setSaving(true);
    const existing = flux.find(f => f.mois === editCell.mois && f.type_flux === editCell.type);
    const valeur = parseFloat(editVal) || 0;
    if (existing) {
      await supabase.from('flux_environnement').update({ valeur }).eq('id', existing.id);
    } else {
      await supabase.from('flux_environnement').insert({
        company_id: companyId, annee, mois: editCell.mois, type_flux: editCell.type, valeur,
      });
    }
    await load();
    setEditCell(null);
    setSaving(false);
  }

  const chartData = MOIS_LABELS.map((label, i) => {
    const mois = i + 1;
    const row: Record<string, unknown> = { mois: label };
    (Object.keys(FLUX_CONFIG) as FluxType[]).forEach(t => {
      row[t] = getValue(mois, t);
    });
    return row;
  });

  return (
    <div className="space-y-5 p-6">
      <div className="db-page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Suivi Environnemental</h1>
          <p className="text-sm text-gray-500">Consommations énergie, eau, déchets et CO₂</p>
        </div>
        <select className="db-input w-auto" value={annee} onChange={e => setAnnee(Number(e.target.value))}>
          {[currentYear - 1, currentYear, currentYear + 1].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* KPIs annuels */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(Object.entries(FLUX_CONFIG) as [FluxType, typeof FLUX_CONFIG[FluxType]][]).filter(([k]) => k !== 'autre').map(([type, cfg]) => {
          const total = getTotal(type);
          const obj = getObjectif(type);
          const pct = obj ? Math.round((total / obj) * 100) : null;
          return (
            <div key={type} className="db-kpi">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{cfg.label}</div>
              <div className="text-2xl font-bold text-gray-900">
                {total.toLocaleString('fr-FR')} <span className="text-sm font-normal text-gray-500">{cfg.unite}</span>
              </div>
              {obj !== null && (
                <div className={`text-xs ${pct! > 100 ? 'text-red-600' : 'text-green-600'}`}>
                  Objectif : {obj.toLocaleString('fr-FR')} {cfg.unite} ({pct}%)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Graphique */}
      <div className="db-panel">
        <div className="mb-3 flex gap-2">
          {(Object.entries(FLUX_CONFIG) as [FluxType, typeof FLUX_CONFIG[FluxType]][]).filter(([k]) => k !== 'autre').map(([type, cfg]) => (
            <button
              key={type}
              onClick={() => setActiveFlux(type)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${activeFlux === type ? 'bg-mase-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey={activeFlux}
              name={FLUX_CONFIG[activeFlux].label}
              stroke={FLUX_CONFIG[activeFlux].color}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Grille de saisie mensuelle */}
      <div className="db-panel overflow-x-auto p-0">
        <table className="db-table">
          <thead>
            <tr>
              <th>Mois</th>
              {(Object.entries(FLUX_CONFIG) as [FluxType, typeof FLUX_CONFIG[FluxType]][]).map(([type, cfg]) => (
                <th key={type}>{cfg.label} ({cfg.unite || '—'})</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOIS_LABELS.map((label, i) => {
              const mois = i + 1;
              return (
                <tr key={mois}>
                  <td className="font-medium text-gray-600">{label}</td>
                  {(Object.keys(FLUX_CONFIG) as FluxType[]).map(type => {
                    const isEditing = editCell?.mois === mois && editCell?.type === type;
                    const val = getValue(mois, type);
                    return (
                      <td key={type}>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              className="db-input w-24"
                              type="number"
                              min="0"
                              value={editVal}
                              onChange={e => setEditVal(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveCell(); if (e.key === 'Escape') setEditCell(null); }}
                              autoFocus
                            />
                            <button className="db-btn-primary py-1 px-2 text-xs" onClick={saveCell} disabled={saving}>✓</button>
                          </div>
                        ) : (
                          <span
                            className={`${canWrite ? 'cursor-pointer hover:underline' : ''} text-sm`}
                            onClick={() => {
                              if (!canWrite) return;
                              setEditCell({ mois, type });
                              setEditVal(val > 0 ? String(val) : '');
                            }}
                          >
                            {val > 0 ? val.toLocaleString('fr-FR') : <span className="text-gray-300">—</span>}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
