// src/pages/DashboardDuerpPage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import RegistreDUERP from '../dashboard/RegistreDUERP';

interface Props { session: Session | null; }

function DuerpContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return <RegistreDUERP companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardDuerpPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <DuerpContent session={session} />
    </DashboardGuard>
  );
}
