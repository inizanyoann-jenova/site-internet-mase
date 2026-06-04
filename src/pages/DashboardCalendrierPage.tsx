import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import CalendrierQHSE from '../dashboard/CalendrierQHSE';

interface Props { session: Session | null }

function CalendrierContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return <CalendrierQHSE companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardCalendrierPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <CalendrierContent session={session} />
    </DashboardGuard>
  );
}
