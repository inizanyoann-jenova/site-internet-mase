import type { Session } from '@supabase/supabase-js';
import DashboardGuard from '../components/dashboard/DashboardGuard';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import FournisseursEvaluation from '../dashboard/FournisseursEvaluation';
import { useCompany } from '../hooks/useCompany';

interface Props { session: Session | null }

function FournisseursContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return (
    <DashboardLayout company={company} membership={membership}>
      <FournisseursEvaluation companyId={company.id} canWrite={canWrite} />
    </DashboardLayout>
  );
}

export default function DashboardFournisseursPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <FournisseursContent session={session} />
    </DashboardGuard>
  );
}
