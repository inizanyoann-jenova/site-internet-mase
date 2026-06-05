import type { StepDefinition, RouteType, RouteSide } from '../../../types/procedures';

interface Props {
  step: StepDefinition;
  onChange: (updated: StepDefinition) => void;
  onRemove: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-800 outline-none focus:border-blue-400';

export default function StepFormRow({ step, onChange, onRemove }: Props) {
  const up = (patch: Partial<StepDefinition>) => onChange({ ...step, ...patch });
  const isD = step.type === 'decision';

  return (
    <div className={`rounded-xl border-[1.5px] p-3 ${isD ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'}`}>
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${isD ? 'bg-amber-500' : 'bg-blue-600'}`}>
          {step.num}
        </div>
        <select
          value={step.type}
          onChange={(e) => up({ type: e.target.value as StepDefinition['type'] })}
          className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[10px] font-bold text-gray-700"
        >
          <option value="activite">📦 Activité</option>
          <option value="decision">🔷 Décision (Oui/Non)</option>
        </select>
        <span className="ml-auto cursor-grab text-gray-300">⠿</span>
        <button onClick={onRemove} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500">✕</button>
      </div>

      <div className="flex flex-col gap-2">
        <Field label={isD ? 'Question de décision *' : "Description de l'activité *"}>
          <input className={inputCls} value={step.activite} onChange={(e) => up({ activite: e.target.value })}
            placeholder={isD ? 'ex: Le contrôle est-il conforme ?' : 'ex: Vérifier les EPI avant départ'} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Acteur responsable">
            <input className={inputCls} value={step.acteur} onChange={(e) => up({ acteur: e.target.value })} placeholder="ex: Responsable QHSE" />
          </Field>
          <Field label="Outil / Document">
            <input className={inputCls} value={step.outil ?? ''} onChange={(e) => up({ outil: e.target.value })} placeholder="ex: Registre EE" />
          </Field>
        </div>

        {/* Routing activité */}
        {!isD && (
          <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-blue-600">↳ Après cette activité</div>
            <div className="flex gap-2">
              <select className={inputCls} value={step.routeTypeAct ?? 'next'}
                onChange={(e) => up({ routeTypeAct: e.target.value as RouteType })}>
                <option value="next">⬇ Étape suivante</option>
                <option value="goto">➡ Aller à l'étape N°...</option>
                <option value="end">🛑 Fin</option>
              </select>
              {step.routeTypeAct === 'goto' && (
                <input type="number" className={`${inputCls} w-16`} placeholder="N°"
                  value={step.routeNumAct ?? ''} onChange={(e) => up({ routeNumAct: e.target.value })} min={1} />
              )}
              <select className={inputCls} value={step.routeSideAct ?? 'auto'}
                onChange={(e) => up({ routeSideAct: e.target.value as RouteSide })}>
                <option value="auto">Sortie Auto</option>
                <option value="bottom">⬇ Bas</option>
                <option value="right">➡ Droite</option>
                <option value="left">⬅ Gauche</option>
              </select>
            </div>
          </div>
        )}

        {/* Routing décision */}
        {isD && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-green-200 bg-green-50 p-2">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-green-700">🟢 Branche OUI</div>
              <input className={`${inputCls} mb-1.5 border-green-200`} placeholder="Libellé OUI" value={step.ouiLabel ?? 'OUI'} onChange={(e) => up({ ouiLabel: e.target.value })} />
              <select className={`${inputCls} border-green-200`} value={step.routeTypeOui ?? 'next'}
                onChange={(e) => up({ routeTypeOui: e.target.value as RouteType })}>
                <option value="next">⬇ Étape suivante</option>
                <option value="goto">➡ Étape N°...</option>
                <option value="end">🛑 Fin</option>
              </select>
              {step.routeTypeOui === 'goto' && (
                <input type="number" className={`${inputCls} mt-1 border-green-200`} placeholder="N°"
                  value={step.routeNumOui ?? ''} onChange={(e) => up({ routeNumOui: e.target.value })} min={1} />
              )}
            </div>
            <div className="rounded-md border border-red-200 bg-red-50 p-2">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-red-700">🔴 Branche NON</div>
              <input className={`${inputCls} mb-1 border-red-200`} placeholder="Libellé NON" value={step.nonLabel ?? 'NON'} onChange={(e) => up({ nonLabel: e.target.value })} />
              <input className={`${inputCls} mb-1 border-red-200`} placeholder="Action si NON (optionnel)" value={step.nonAction ?? ''} onChange={(e) => up({ nonAction: e.target.value })} />
              {step.nonAction && (
                <input className={`${inputCls} mb-1 border-red-200`} placeholder="Acteur action NON"
                  value={step.nonActor ?? ''} onChange={(e) => up({ nonActor: e.target.value })} />
              )}
              <select className={`${inputCls} border-red-200`} value={step.routeTypeNon ?? 'end'}
                onChange={(e) => up({ routeTypeNon: e.target.value as RouteType })}>
                <option value="next">⬇ Étape suivante</option>
                <option value="goto">➡ Étape N°...</option>
                <option value="end">🛑 Fin</option>
              </select>
              {step.routeTypeNon === 'goto' && (
                <input type="number" className={`${inputCls} mt-1 border-red-200`} placeholder="N°"
                  value={step.routeNumNon ?? ''} onChange={(e) => up({ routeNumNon: e.target.value })} min={1} />
              )}
              <select className={`${inputCls} mt-1 border-red-200`} value={step.routeSideNon ?? 'auto'}
                onChange={(e) => up({ routeSideNon: e.target.value as RouteSide })}>
                <option value="auto">Sortie Auto</option>
                <option value="right">➡ Droite</option>
                <option value="left">⬅ Gauche</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
