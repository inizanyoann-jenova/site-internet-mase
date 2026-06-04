import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import FournisseursEvaluation from '../dashboard/FournisseursEvaluation';

interface Props { session: Session | null }

function FournisseursContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return <FournisseursEvaluation companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardFournisseursPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <FournisseursContent session={session} />
    </DashboardGuard>
  );
}
