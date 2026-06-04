import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import NotificationsSettings from '../dashboard/NotificationsSettings';

interface Props { session: Session | null }

function NotifContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  return <NotificationsSettings companyId={company.id} isAdmin={membership?.role === 'admin'} />;
}

export default function DashboardNotificationsPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <NotifContent session={session} />
    </DashboardGuard>
  );
}
