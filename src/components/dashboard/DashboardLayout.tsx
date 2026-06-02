// src/components/dashboard/DashboardLayout.tsx
import { useState } from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import type { Company, CompanyMember } from '../../hooks/useCompany';

interface Props {
  company: Company;
  membership: CompanyMember;
  children: React.ReactNode;
}

export function DashboardLayout({ company, membership, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f3]">
      {/* Sidebar desktop */}
      <div className="hidden w-56 shrink-0 lg:block">
        <DashboardSidebar company={company} membership={membership} />
      </div>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-56 transition-transform lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <DashboardSidebar
          company={company}
          membership={membership}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Contenu principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header mobile */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1 text-slate-600 hover:bg-slate-100"
          >
            ☰
          </button>
          <span className="text-sm font-semibold text-[var(--mase-heading)]">
            {company.name}
          </span>
        </div>

        {/* Zone de contenu scrollable */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
