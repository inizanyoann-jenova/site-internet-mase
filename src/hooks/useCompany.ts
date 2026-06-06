import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { PAYMENT_SUSPENDED } from '../lib/paymentConfig';

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
      // En mode développement, s'assurer que la company existe via RPC (contourne RLS)
      if (PAYMENT_SUSPENDED) {
        await supabase.rpc('setup_dev_company');
      }

      const { data, error } = await supabase
        .from('company_members')
        .select('*, company:companies(*)')
        .eq('user_id', session.user.id)
        .not('accepted_at', 'is', null)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setState({ company: null, membership: null, isLoading: false, error: null });
        return;
      }

      const { company, ...membershipData } = data;
      setState({
        company: company as Company,
        membership: { ...membershipData, company } as CompanyMember,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState({ company: null, membership: null, isLoading: false, error: err instanceof Error ? err : new Error('Unknown error') });
    }
  }, [session]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...state, refetch: fetch };
}
