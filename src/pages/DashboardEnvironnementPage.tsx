import type { Session } from '@supabase/supabase-js';
import DashboardGuard from '../components/dashboard/DashboardGuard';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import EnvironnementSuivi from '../dashboard/EnvironnementSuivi';
import { useCompany } from '../hooks/useCompany';

interface Props { session: Session | null }

function EnvContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return (
    <DashboardLayout company={company} membership={membership}>
      <EnvironnementSuivi companyId={company.id} canWrite={canWrite} />
    </DashboardLayout>
  );
}

export default function DashboardEnvironnementPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <EnvContent session={session} />
    </DashboardGuard>
  );
}
