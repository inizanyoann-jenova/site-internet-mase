// src/components/dashboard/DashboardGuard.tsx
import { Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { useCompany } from '../../hooks/useCompany';
import { DashboardLayout } from './DashboardLayout';

interface Props {
  session: Session | null;
  children: React.ReactNode;
}

export function DashboardGuard({ session, children }: Props) {
  const { company, membership, isLoading, error } = useCompany(session);

  if (!session) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3]">
        <div className="text-sm text-slate-500">Chargement…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3] p-6">
        <div className="max-w-md rounded-2xl bg-white p-6 shadow-lg text-center">
          <div className="text-2xl mb-3">⚠️</div>
          <p className="text-sm font-medium text-[var(--mase-heading)]">
            Impossible de charger votre espace
          </p>
          <p className="mt-1 text-xs text-slate-500">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-full px-5 py-2 text-sm font-bold text-white hover:opacity-90"
            style={{ backgroundColor: 'var(--mase-primary)' }}
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!company || !membership) {
    return <Navigate to="/dashboard/onboarding" replace />;
  }

  if (company.subscription_status === 'canceled') {
    return <Navigate to="/dashboard/acheter" replace />;
  }

  return (
    <DashboardLayout company={company} membership={membership}>
      {children}
    </DashboardLayout>
  );
}
