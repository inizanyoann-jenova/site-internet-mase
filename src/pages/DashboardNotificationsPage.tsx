import type { Session } from '@supabase/supabase-js';
import DashboardGuard from '../components/dashboard/DashboardGuard';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import NotificationsSettings from '../dashboard/NotificationsSettings';
import { useCompany } from '../hooks/useCompany';

interface Props { session: Session | null }

function NotifContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  return (
    <DashboardLayout company={company} membership={membership}>
      <NotificationsSettings companyId={company.id} isAdmin={membership?.role === 'admin'} />
    </DashboardLayout>
  );
}

export default function DashboardNotificationsPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <NotifContent session={session} />
    </DashboardGuard>
  );
}
