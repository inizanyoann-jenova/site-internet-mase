import type { Session } from '@supabase/supabase-js';
import DashboardGuard from '../components/dashboard/DashboardGuard';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import ParametresEntreprise from '../dashboard/ParametresEntreprise';
import { useCompany } from '../hooks/useCompany';

interface Props { session: Session | null }

function ParametresContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  return (
    <DashboardLayout company={company} membership={membership}>
      <ParametresEntreprise companyId={company.id} isAdmin={membership?.role === 'admin'} />
    </DashboardLayout>
  );
}

export default function DashboardParametresPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <ParametresContent session={session} />
    </DashboardGuard>
  );
}
