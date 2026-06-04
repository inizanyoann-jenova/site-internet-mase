import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import AnalyseRisqueChantier from '../dashboard/AnalyseRisqueChantier';

interface Props { session: Session | null }

function RisqueChantierContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse', 'operateur'].includes(membership?.role ?? '');
  return <AnalyseRisqueChantier companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardRisqueChantierPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <RisqueChantierContent session={session} />
    </DashboardGuard>
  );
}
