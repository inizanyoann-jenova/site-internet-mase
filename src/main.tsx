// src/main.tsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { SessionContext } from './contexts/SessionContext';
import App from './App';
import HomePage from './pages/HomePage';
import MatricePage from './pages/MatricePage';
import DashboardPage from './pages/DashboardPage';
import DashboardOnboardingPage from './pages/DashboardOnboardingPage';
import DashboardJoinPage from './pages/DashboardJoinPage';
import DashboardTeamPage from './pages/DashboardTeamPage';
import DashboardPurchasePage from './pages/DashboardPurchasePage';
import DashboardDuerpPage from './pages/DashboardDuerpPage';
import DashboardActionsPage from './pages/DashboardActionsPage';
import DashboardAccidentsPage from './pages/DashboardAccidentsPage';
import DashboardHabilitationsPage from './pages/DashboardHabilitationsPage';
import DashboardKPIsPage from './pages/DashboardKPIsPage';
import DashboardRevuePage from './pages/DashboardRevuePage';
import DashboardObjectifsPage from './pages/DashboardObjectifsPage';
import DashboardQualitePage from './pages/DashboardQualitePage';
import './index.css';

function Root() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={session}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/outil" element={<App />} />
          <Route path="/matrice-polyvalence" element={<MatricePage />} />
          <Route path="/dashboard" element={<DashboardPage session={session} />} />
          <Route path="/dashboard/onboarding" element={<DashboardOnboardingPage session={session} />} />
          <Route path="/dashboard/rejoindre" element={<DashboardJoinPage session={session} />} />
          <Route path="/dashboard/equipe" element={<DashboardTeamPage session={session} />} />
          <Route path="/dashboard/acheter" element={<DashboardPurchasePage session={session} />} />
          <Route path="/dashboard/duerp" element={<DashboardDuerpPage session={session} />} />
          <Route path="/dashboard/actions" element={<DashboardActionsPage session={session} />} />
          <Route path="/dashboard/accidents" element={<DashboardAccidentsPage session={session} />} />
          <Route path="/dashboard/habilitations" element={<DashboardHabilitationsPage session={session} />} />
          <Route path="/dashboard/kpis" element={<DashboardKPIsPage session={session} />} />
          <Route path="/dashboard/revue" element={<DashboardRevuePage session={session} />} />
          <Route path="/dashboard/objectifs" element={<DashboardObjectifsPage session={session} />} />
          <Route path="/dashboard/audits" element={<DashboardQualitePage session={session} />} />
        </Routes>
      </BrowserRouter>
    </SessionContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Root /></React.StrictMode>
);
