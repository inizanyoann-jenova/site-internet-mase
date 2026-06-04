import type { Session } from '@supabase/supabase-js';
import DashboardGuard from '../components/dashboard/DashboardGuard';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import CalendrierQHSE from '../dashboard/CalendrierQHSE';
import { useCompany } from '../hooks/useCompany';

interface Props { session: Session | null }

function CalendrierContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return (
    <DashboardLayout company={company} membership={membership}>
      <CalendrierQHSE companyId={company.id} canWrite={canWrite} />
    </DashboardLayout>
  );
}

export default function DashboardCalendrierPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <CalendrierContent session={session} />
    </DashboardGuard>
  );
}
