import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import JournalAudit from '../dashboard/JournalAudit';

interface Props { session: Session | null }

function JournalContent({ session }: Props) {
  const { company } = useCompany(session);
  if (!company) return null;
  return <JournalAudit companyId={company.id} />;
}

export default function DashboardJournalAuditPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <JournalContent session={session} />
    </DashboardGuard>
  );
}
