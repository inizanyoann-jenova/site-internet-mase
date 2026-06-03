import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { DashboardLanding } from '../components/dashboard/DashboardLanding';
import { useCompany } from '../hooks/useCompany';
import DashboardComex from '../dashboard/DashboardComex';

interface Props { session: Session | null; }

function ComexContent({ session }: Props) {
  const { company } = useCompany(session);
  if (!company) return null;
  return <DashboardComex companyId={company.id} />;
}

export default function DashboardPage({ session }: Props) {
  if (!session) return <DashboardLanding />;
  return (
    <DashboardGuard session={session}>
      <ComexContent session={session} />
    </DashboardGuard>
  );
}
