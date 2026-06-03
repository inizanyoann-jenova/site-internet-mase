// src/pages/DashboardPage.tsx
import { Link } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';

interface Props { session: Session | null; }

function VueDirectionContent({ session }: Props) {
  const { company } = useCompany(session);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--mase-heading)]">Vue Direction</h1>
        <p className="text-[var(--mase-muted)] text-sm mt-1">Bienvenue dans le SMI Dashboard{company ? ` — ${company.name}` : ''}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { path: '/dashboard/duerp',        icon: '📋', label: 'Registre DUERP',        desc: 'Évaluation des risques professionnels',  color: '#f59e0b' },
          { path: '/dashboard/actions',       icon: '✅', label: "Plan d'Actions PDCA",   desc: 'Actions correctives et préventives',     color: '#3b82f6' },
          { path: '/dashboard/accidents',     icon: '🚨', label: 'Accidents & Incidents',  desc: 'Déclaration, analyse, calcul TF/TG',    color: '#ef4444' },
          { path: '/dashboard/habilitations', icon: '🏅', label: 'Habilitations',          desc: "Alertes d'expiration en temps réel",    color: '#8b5cf6' },
          { path: '/dashboard/kpis',          icon: '📊', label: 'KPIs Sécurité',          desc: 'Tableaux de bord et indicateurs',       color: '#06b6d4' },
          { path: '/dashboard/revue',         icon: '📝', label: 'Revue de Direction',      desc: 'Synthèse annuelle + rapport PDF',       color: '#10b981' },
        ].map(m => (
          <Link key={m.path} to={m.path} className="block rounded-2xl bg-white p-6 shadow-sm border border-[var(--mase-border)] hover:shadow-md transition-shadow" style={{ textDecoration: 'none' }}>
            <div className="flex items-center gap-3 mb-3">
              <span style={{ fontSize: 24 }}>{m.icon}</span>
              <h3 className="font-bold text-[var(--mase-heading)]">{m.label}</h3>
            </div>
            <p className="text-sm text-[var(--mase-muted)]">{m.desc}</p>
            <div style={{ marginTop: 12, height: 4, background: `${m.color}25`, borderRadius: 2 }}>
              <div style={{ height: '100%', width: '33%', background: m.color, borderRadius: 2 }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <VueDirectionContent session={session} />
    </DashboardGuard>
  );
}
