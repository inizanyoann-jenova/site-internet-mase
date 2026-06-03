// src/pages/DashboardQualitePage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import QualiteAudits from '../dashboard/QualiteAudits';

interface Props { session: Session | null; }

function QualiteContent({ session }: Props) {
  const { company, membership } = useCompany(session);
  if (!company) return null;
  const canWrite = ['admin', 'responsable_qhse'].includes(membership?.role ?? '');
  return <QualiteAudits companyId={company.id} canWrite={canWrite} />;
}

export default function DashboardQualitePage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <QualiteContent session={session} />
    </DashboardGuard>
  );
}
