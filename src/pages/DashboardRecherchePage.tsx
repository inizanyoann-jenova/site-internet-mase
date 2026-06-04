import type { Session } from '@supabase/supabase-js';
import DashboardGuard from '../components/dashboard/DashboardGuard';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import RechercheGlobale from '../dashboard/RechercheGlobale';
import { useCompany } from '../hooks/useCompany';

interface Props { session: Session | null }

function RechercheContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  return (
    <DashboardLayout company={company} membership={membership}>
      <RechercheGlobale companyId={company.id} />
    </DashboardLayout>
  );
}

export default function DashboardRecherchePage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <RechercheContent session={session} />
    </DashboardGuard>
  );
}
