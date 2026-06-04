import type { Session } from '@supabase/supabase-js';
import DashboardGuard from '../components/dashboard/DashboardGuard';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import RegistreRGPD from '../dashboard/RegistreRGPD';
import { useCompany } from '../hooks/useCompany';

interface Props { session: Session | null }

function RGPDContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return (
    <DashboardLayout company={company} membership={membership}>
      <RegistreRGPD companyId={company.id} canWrite={canWrite} />
    </DashboardLayout>
  );
}

export default function DashboardRGPDPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <RGPDContent session={session} />
    </DashboardGuard>
  );
}
