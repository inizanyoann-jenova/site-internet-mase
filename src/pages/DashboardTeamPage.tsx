// src/pages/DashboardTeamPage.tsx
import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';

const ROLES = ['admin', 'responsable_qhse', 'direction', 'lecteur', 'operateur'] as const;
type Role = typeof ROLES[number];

interface Member {
  id: string;
  email: string;
  role: Role;
  accepted_at: string | null;
  user_id: string | null;
}

interface Props {
  session: Session | null;
}

function TeamContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('lecteur');
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isAdmin = membership?.role === 'admin';

  useEffect(() => {
    if (!company) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('company_members')
        .select('id, email, role, accepted_at, user_id')
        .eq('company_id', company.id)
        .order('invited_at', { ascending: true });
      setMembers((data as Member[]) ?? []);
      setLoading(false);
    };
    load();
  }, [company]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !inviteEmail.trim()) return;

    setInviting(true);
    setError(null);
    setSuccessMsg(null);

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const token = currentSession?.access_token;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-company-member`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_id: company.id,
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      },
    );

    setInviting(false);

    if (!res.ok) {
      const err = await res.json();
      setError(err.error ?? "Erreur lors de l'invitation");
      return;
    }

    const result = await res.json();
    setSuccessMsg(`Invitation envoyée à ${inviteEmail}. Lien : ${result.invite_url}`);
    setInviteEmail('');

    const { data } = await supabase
      .from('company_members')
      .select('id, email, role, accepted_at, user_id')
      .eq('company_id', company.id)
      .order('invited_at', { ascending: true });
    setMembers((data as Member[]) ?? []);
  };

  const handleRevoke = async (memberId: string) => {
    if (!confirm('Supprimer ce membre ?')) return;
    await supabase.from('company_members').delete().eq('id', memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--mase-heading)]">Mon équipe</h1>
      <p className="mt-1 text-sm text-[var(--mase-muted)]">
        {members.filter((m) => m.accepted_at).length} membre(s) actif(s) — {company?.name}
      </p>

      {isAdmin && (
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-[var(--mase-heading)]">
            Inviter un collègue
          </h2>
          <form onSubmit={handleInvite} className="flex flex-wrap gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              placeholder="email@entreprise.fr"
              className="flex-1 min-w-48 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--mase-primary)]"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--mase-primary)]"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.replace('_', ' ')}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="rounded-full px-5 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--mase-primary)' }}
            >
              {inviting ? 'Envoi…' : '+ Inviter'}
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {successMsg && <p className="mt-2 text-sm text-green-600">{successMsg}</p>}
        </div>
      )}

      <div className="mt-4 rounded-2xl bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Chargement…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Rôle</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 text-slate-700">{m.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {m.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {m.accepted_at ? '✅ Actif' : '⏳ Invitation en attente'}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      {m.user_id !== session?.user.id && (
                        <button
                          onClick={() => handleRevoke(m.id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Retirer
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function DashboardTeamPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <TeamContent session={session} />
    </DashboardGuard>
  );
}
