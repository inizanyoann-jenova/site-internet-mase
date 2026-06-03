// src/pages/DashboardRevuePage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';
import { useCompany } from '../hooks/useCompany';
import RevueDirection from '../dashboard/RevueDirection';

interface Props { session: Session | null; }

function RevueContent({ session }: Props) {
  const { company } = useCompany(session);
  if (!company) return null;
  return <RevueDirection companyId={company.id} companyName={company.name} />;
}

export default function DashboardRevuePage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <RevueContent session={session} />
    </DashboardGuard>
  );
}
