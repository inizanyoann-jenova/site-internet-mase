// src/pages/DashboardHabilitationsPage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import Habilitations from '../dashboard/Habilitations';

interface Props { session: Session | null; }

function HabilitationsContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return <Habilitations companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardHabilitationsPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <HabilitationsContent session={session} />
    </DashboardGuard>
  );
}
