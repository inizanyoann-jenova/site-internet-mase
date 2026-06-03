// src/pages/DashboardRHPage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import SocialRH from '../dashboard/SocialRH';

interface Props { session: Session | null; }

function RHContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return <SocialRH companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardRHPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <RHContent session={session} />
    </DashboardGuard>
  );
}
