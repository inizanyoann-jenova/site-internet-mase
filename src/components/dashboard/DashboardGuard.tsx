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
  const { company, membership, isLoading } = useCompany(session);

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

  if (!company || !membership) {
    return <Navigate to="/dashboard/onboarding" replace />;
  }

  return (
    <DashboardLayout company={company} membership={membership}>
      {children}
    </DashboardLayout>
  );
}
