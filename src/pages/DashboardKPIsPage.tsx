// src/pages/DashboardKPIsPage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import KPIsSecurite from '../dashboard/KPIsSecurite';

interface Props { session: Session | null; }

function KPIsContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return <KPIsSecurite companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardKPIsPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <KPIsContent session={session} />
    </DashboardGuard>
  );
}
