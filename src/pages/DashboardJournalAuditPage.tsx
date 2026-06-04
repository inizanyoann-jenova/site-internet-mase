import type { Session } from '@supabase/supabase-js';
import DashboardGuard from '../components/dashboard/DashboardGuard';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import JournalAudit from '../dashboard/JournalAudit';
import { useCompany } from '../hooks/useCompany';

interface Props { session: Session | null }

function JournalContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  return (
    <DashboardLayout company={company} membership={membership}>
      <JournalAudit companyId={company.id} />
    </DashboardLayout>
  );
}

export default function DashboardJournalAuditPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <JournalContent session={session} />
    </DashboardGuard>
  );
}
