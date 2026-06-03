// src/pages/DashboardActionsPage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import PlanActions from '../dashboard/PlanActions';

interface Props { session: Session | null; }

function ActionsContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return <PlanActions companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardActionsPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <ActionsContent session={session} />
    </DashboardGuard>
  );
}
