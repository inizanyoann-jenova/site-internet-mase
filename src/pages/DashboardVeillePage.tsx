import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import VeilleReglementaire from '../dashboard/VeilleReglementaire';

interface Props { session: Session | null }

function VeilleContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return <VeilleReglementaire companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardVeillePage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <VeilleContent session={session} />
    </DashboardGuard>
  );
}
