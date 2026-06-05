import type { WizardStepProps } from './ProcedureWizard';
import type { Approver, Revision } from '../../../types/procedures';

export default function Step5Approval({ state, update, onNext, onBack, isSaving }: WizardStepProps) {
  const updateApprover = (id: string, patch: Partial<Approver>) =>
    update({ approvers: state.approvers.map((a) => a.id === id ? { ...a, ...patch } : a) });

  const updateRevision = (id: string, patch: Partial<Revision>) =>
    update({ revisions: state.revisions.map((r) => r.id === id ? { ...r, ...patch } : r) });

  const addRevision = () =>
    update({ revisions: [...state.revisions, { id: crypto.randomUUID(), version: `V${state.revisions.length + 1}.0`, date: new Date().toISOString().split('T')[0], auteur: '', nature: '' }] });

  const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400';

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-xl font-bold text-gray-900">Approbation & Révisions</h2>
      <p className="mb-6 text-sm text-gray-500">Définissez les validateurs de cette procédure et l'historique des révisions.</p>

      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">Approbateurs</h3>
      <div className="mb-6 flex flex-col gap-3">
        {state.approvers.map((approver) => (
          <div key={approver.id} className="grid gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3" style={{ gridTemplateColumns: '160px 1fr 140px' }}>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Rôle</label>
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">{approver.role}</div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Nom & Fonction</label>
              <input className={inputCls} value={approver.nom} onChange={(e) => updateApprover(approver.id, { nom: e.target.value })} placeholder="ex: Marion HUBERT — Responsable QHSE" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Date</label>
              <input type="date" className={inputCls} value={approver.date ?? ''} onChange={(e) => updateApprover(approver.id, { date: e.target.value })} />
            </div>
          </div>
        ))}
      </div>

      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">Historique des révisions</h3>
      <div className="mb-3 flex flex-col gap-2">
        {state.revisions.map((rev) => (
          <div key={rev.id} className="grid grid-cols-4 gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2">
            <input className={inputCls} value={rev.version} onChange={(e) => updateRevision(rev.id, { version: e.target.value })} placeholder="V1.0" />
            <input type="date" className={inputCls} value={rev.date} onChange={(e) => updateRevision(rev.id, { date: e.target.value })} />
            <input className={inputCls} value={rev.auteur} onChange={(e) => updateRevision(rev.id, { auteur: e.target.value })} placeholder="Auteur" />
            <input className={inputCls} value={rev.nature} onChange={(e) => updateRevision(rev.id, { nature: e.target.value })} placeholder="Nature de la modification" />
          </div>
        ))}
      </div>
      <button onClick={addRevision}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-xs font-semibold text-gray-500 hover:border-blue-300 hover:text-blue-600 transition">
        + Ajouter une révision
      </button>

      <div className="mb-8">
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Fréquence de révision</label>
        <select className={inputCls} value={state.revisionFrequency ?? 'Annuelle'} onChange={(e) => update({ revisionFrequency: e.target.value })}>
          <option>Annuelle</option>
          <option>Semestrielle</option>
          <option>Trimestrielle</option>
          <option>En cas de modification significative</option>
        </select>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50">← Retour</button>
        <button onClick={() => onNext()} disabled={isSaving}
          className="rounded-xl px-8 py-3 font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--mase-primary)' }}>
          {isSaving ? 'Sauvegarde…' : 'Aperçu →'}
        </button>
      </div>
    </div>
  );
}
