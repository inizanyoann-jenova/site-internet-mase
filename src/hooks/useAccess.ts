import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AccessState {
  hasPurchase: boolean;
  isLoading: boolean;
  savedAnswers: Record<string, string> | null;
}

export function useAccess(session: Session | null): AccessState & { refetch: () => void } {
  const [state, setState] = useState<AccessState>({
    hasPurchase: false,
    isLoading: false,
    savedAnswers: null,
  });

  const fetch = useCallback(async () => {
    if (!session) {
      setState({ hasPurchase: false, isLoading: false, savedAnswers: null });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const [purchaseResult, progressResult] = await Promise.all([
        supabase
          .from('purchases')
          .select('id')
          .eq('user_id', session.user.id)
          .limit(1)
          .maybeSingle(),
        supabase
          .from('questionnaire_progress')
          .select('answers')
          .eq('user_id', session.user.id)
          .maybeSingle(),
      ]);

      console.log('[useAccess] user_id:', session.user.id);
      console.log('[useAccess] purchase:', purchaseResult);

      setState({
        hasPurchase: !!purchaseResult.data,
        isLoading: false,
        savedAnswers: (progressResult.data?.answers as Record<string, string>) ?? null,
      });
    } catch (err) {
      console.error('[useAccess] erreur:', err);
      setState({ hasPurchase: false, isLoading: false, savedAnswers: null });
    }
  }, [session]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...state, refetch: fetch };
}
