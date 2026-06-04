import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import ParametresEntreprise from '../dashboard/ParametresEntreprise';

interface Props { session: Session | null }

function ParametresContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  return (
    <ParametresEntreprise companyId={company.id} isAdmin={membership?.role === 'admin'} />
  );
}

export default function DashboardParametresPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <ParametresContent session={session} />
    </DashboardGuard>
  );
}
