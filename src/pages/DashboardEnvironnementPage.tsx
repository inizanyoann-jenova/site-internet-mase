import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import EnvironnementSuivi from '../dashboard/EnvironnementSuivi';

interface Props { session: Session | null }

function EnvContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return <EnvironnementSuivi companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardEnvironnementPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <EnvContent session={session} />
    </DashboardGuard>
  );
}
