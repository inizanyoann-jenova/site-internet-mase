import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Company {
  id: string;
  name: string;
  siret: string | null;
  subscription_status: string;
  tool_slug: string;
  admin_user_id: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  email: string;
  role: 'admin' | 'responsable_qhse' | 'direction' | 'lecteur' | 'operateur';
  accepted_at: string | null;
  company: Company;
}

interface CompanyState {
  company: Company | null;
  membership: CompanyMember | null;
  isLoading: boolean;
  error: Error | null;
}

export function useCompany(session: Session | null): CompanyState & { refetch: () => void } {
  const [state, setState] = useState<CompanyState>({
    company: null,
    membership: null,
    isLoading: false,
    error: null,
  });

  const fetch = useCallback(async () => {
    if (!session) {
      setState({ company: null, membership: null, isLoading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const { data, error } = await supabase.rpc('get_my_dashboard_access');

      if (error) throw error;

      if (!data) {
        setState({ company: null, membership: null, isLoading: false, error: null });
        return;
      }

      const company: Company = {
        id: data.company_id,
        name: data.company_name,
        siret: null,
        subscription_status: data.subscription_status,
        tool_slug: data.tool_slug,
        admin_user_id: data.admin_user_id,
      };
      const membership: CompanyMember = {
        id: data.member_id,
        company_id: data.company_id,
        user_id: session.user.id,
        email: data.member_email,
        role: data.member_role,
        accepted_at: data.member_accepted_at,
        company,
      };
      setState({ company, membership, isLoading: false, error: null });
    } catch (err) {
      setState({ company: null, membership: null, isLoading: false, error: err instanceof Error ? err : new Error('Unknown error') });
    }
  }, [session]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...state, refetch: fetch };
}
