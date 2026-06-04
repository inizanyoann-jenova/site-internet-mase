import type { Session } from '@supabase/supabase-js';
import DashboardGuard from '../components/dashboard/DashboardGuard';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import AnalyseRisqueChantier from '../dashboard/AnalyseRisqueChantier';
import { useCompany } from '../hooks/useCompany';

interface Props { session: Session | null }

function RisqueChantierContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  const canWrite = ['admin', 'responsable_qhse', 'operateur'].includes(membership?.role ?? '');
  return (
    <DashboardLayout company={company} membership={membership}>
      <AnalyseRisqueChantier companyId={company.id} canWrite={canWrite} />
    </DashboardLayout>
  );
}

export default function DashboardRisqueChantierPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <RisqueChantierContent session={session} />
    </DashboardGuard>
  );
}
