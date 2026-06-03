// src/pages/DashboardObjectifsPage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import ObjectifsQHSE from '../dashboard/ObjectifsQHSE';

interface Props { session: Session | null; }

function ObjectifsContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return <ObjectifsQHSE companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardObjectifsPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <ObjectifsContent session={session} />
    </DashboardGuard>
  );
}
