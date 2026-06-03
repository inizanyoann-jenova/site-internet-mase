// src/pages/DashboardExportPage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import ArchivesExport from '../dashboard/ArchivesExport';

interface Props { session: Session | null; }

function ExportContent({ session }: Props) {
  const { company } = useCompany(session);
  if (!company) return null;
  return <ArchivesExport companyId={company.id} />;
}

export default function DashboardExportPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <ExportContent session={session} />
    </DashboardGuard>
  );
}
