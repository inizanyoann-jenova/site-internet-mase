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
  accepted_at: string;
  company: Company;
}

interface CompanyState {
  company: Company | null;
  membership: CompanyMember | null;
  isLoading: boolean;
}

export function useCompany(session: Session | null): CompanyState & { refetch: () => void } {
  const [state, setState] = useState<CompanyState>({
    company: null,
    membership: null,
    isLoading: false,
  });

  const fetch = useCallback(async () => {
    if (!session) {
      setState({ company: null, membership: null, isLoading: false });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const { data, error } = await supabase
        .from('company_members')
        .select('*, company:companies(*)')
        .eq('user_id', session.user.id)
        .not('accepted_at', 'is', null)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setState({ company: null, membership: null, isLoading: false });
        return;
      }

      const { company, ...membershipData } = data;
      setState({
        company: company as Company,
        membership: { ...membershipData, company } as CompanyMember,
        isLoading: false,
      });
    } catch {
      setState({ company: null, membership: null, isLoading: false });
    }
  }, [session]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...state, refetch: fetch };
}
