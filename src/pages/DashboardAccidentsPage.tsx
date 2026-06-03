// src/pages/DashboardAccidentsPage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import SecuriteAccidents from '../dashboard/SecuriteAccidents';

interface Props { session: Session | null; }

function AccidentsContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return <SecuriteAccidents companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardAccidentsPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <AccidentsContent session={session} />
    </DashboardGuard>
  );
}
