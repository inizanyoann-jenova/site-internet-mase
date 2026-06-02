// src/components/dashboard/DashboardSidebar.tsx
import { Link, useLocation } from 'react-router-dom';
import type { Company, CompanyMember } from '../../hooks/useCompany';

interface SidebarItem {
  path: string;
  label: string;
  icon: string;
}

const SIDEBAR_GROUPS: { label: string; items: SidebarItem[] }[] = [
  {
    label: 'Pilotage',
    items: [
      { path: '/dashboard', label: 'Vue Direction', icon: '🏭' },
      { path: '/dashboard/kpis', label: 'KPIs Sécurité', icon: '📊' },
      { path: '/dashboard/objectifs', label: 'Objectifs QHSE', icon: '🎯' },
    ],
  },
  {
    label: 'Sécurité',
    items: [
      { path: '/dashboard/duerp', label: 'DUERP', icon: '📋' },
      { path: '/dashboard/accidents', label: 'Accidents', icon: '🚨' },
      { path: '/dashboard/habilitations', label: 'Habilitations', icon: '🏅' },
      { path: '/dashboard/actions', label: "Plan d'actions", icon: '✅' },
    ],
  },
  {
    label: 'Qualité / RH',
    items: [
      { path: '/dashboard/audits', label: 'Audits & NC', icon: '🔍' },
      { path: '/dashboard/rh', label: 'Social RH', icon: '👥' },
      { path: '/dashboard/reunions', label: 'Réunions QHSE', icon: '📅' },
    ],
  },
  {
    label: 'Direction',
    items: [
      { path: '/dashboard/revue', label: 'Revue de Direction', icon: '📝' },
      { path: '/dashboard/export', label: 'Export Excel/PDF', icon: '📤' },
    ],
  },
];

interface Props {
  company: Company;
  membership: CompanyMember;
  onClose?: () => void;
}

export function DashboardSidebar({ company, membership, onClose }: Props) {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col bg-[var(--mase-primary)] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-4">
        <div className="text-xs font-bold uppercase tracking-widest text-white/50">
          SMI Dashboard
        </div>
        <div className="mt-1 truncate text-sm font-semibold text-white">
          {company.name}
        </div>
        <div className="mt-0.5 text-xs text-white/50 capitalize">
          {membership.role.replace('_', ' ')}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
              {group.label}
            </div>
            {group.items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-white/15 font-semibold text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-2 py-3">
        {membership.role === 'admin' && (
          <Link
            to="/dashboard/equipe"
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span>⚙️</span>
            <span>Mon équipe</span>
          </Link>
        )}
        <Link
          to="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/50 transition-colors hover:text-white/70"
        >
          <span>←</span>
          <span>Retour au site</span>
        </Link>
      </div>
    </div>
  );
}
