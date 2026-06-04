import type { Session } from '@supabase/supabase-js';
import DashboardGuard from '../components/dashboard/DashboardGuard';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import VeilleReglementaire from '../dashboard/VeilleReglementaire';
import { useCompany } from '../hooks/useCompany';

interface Props { session: Session | null }

function VeilleContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return (
    <DashboardLayout company={company} membership={membership}>
      <VeilleReglementaire companyId={company.id} canWrite={canWrite} />
    </DashboardLayout>
  );
}

export default function DashboardVeillePage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <VeilleContent session={session} />
    </DashboardGuard>
  );
}
