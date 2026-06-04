import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import RechercheGlobale from '../dashboard/RechercheGlobale';

interface Props { session: Session | null }

function RechercheContent({ session }: Props) {
  const { company } = useCompany(session);
  if (!company) return null;
  return <RechercheGlobale companyId={company.id} />;
}

export default function DashboardRecherchePage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <RechercheContent session={session} />
    </DashboardGuard>
  );
}
