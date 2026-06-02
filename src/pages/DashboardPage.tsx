// src/pages/DashboardPage.tsx
import type { Session } from '@supabase/supabase-js';
import { DashboardGuard } from '../components/dashboard/DashboardGuard';

interface Props {
  session: Session | null;
}

export default function DashboardPage({ session }: Props) {
  return (
    <DashboardGuard session={session}>
      <div>
        <h1 className="text-xl font-bold text-[var(--mase-heading)]">
          Vue Direction
        </h1>
        <p className="mt-2 text-sm text-[var(--mase-muted)]">
          Les modules arrivent dans la Phase 2. L'infrastructure est en place.
        </p>
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">
            🚧 Les modules DUERP, Plan d'actions, Accidents, Habilitations, KPIs et Revue de Direction sont en cours de développement.
          </p>
        </div>
      </div>
    </DashboardGuard>
  );
}
