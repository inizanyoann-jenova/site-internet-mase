// src/components/matrice/MatriceContext.tsx
import { createContext, useContext, useReducer, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { matriceReducer } from './matrice.utils';
import { DEMO_DATA } from './demoData';
import type { MatriceData, MatriceAction, SaveStatus } from './types';

interface MatriceContextValue {
  data: MatriceData;
  dispatch: React.Dispatch<MatriceAction>;
  saveStatus: SaveStatus;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const MatriceContext = createContext<MatriceContextValue | null>(null);

export function MatriceProvider({ session, children }: { session: Session; children: React.ReactNode }) {
  const [data, dispatch] = useReducer(matriceReducer, DEMO_DATA);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [activeTab, setActiveTab] = useState('matrice');
  const isFirstLoad = useRef(true);
  const initializedRef = useRef(false);

  // Chargement initial depuis Supabase
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    (async () => {
      const { data: row, error } = await supabase
        .from('matrices')
        .select('data')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('[MatriceContext] Failed to load:', error);
        return; // keep isFirstLoad = true → auto-save stays blocked
      }

      if (row?.data) {
        dispatch({ type: 'SET_DATA', data: row.data as MatriceData });
      } else {
        // Première visite : insérer les données de démo
        const { error: insertError } = await supabase.from('matrices').insert({
          user_id: session.user.id,
          data: DEMO_DATA,
        });
        if (insertError) console.error('[MatriceContext] Failed to insert demo data:', insertError);
      }
      isFirstLoad.current = false;
    })();
  }, [session.user.id]);

  // Auto-save avec debounce 1.5s
  useEffect(() => {
    if (isFirstLoad.current) return;

    const timer = setTimeout(async () => {
      setSaveStatus('saving');
      const { error } = await supabase
        .from('matrices')
        .upsert(
          { user_id: session.user.id, data, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
      setSaveStatus(error ? 'error' : 'saved');
    }, 1500);

    return () => clearTimeout(timer);
  }, [data, session.user.id]);

  return (
    <MatriceContext.Provider value={{ data, dispatch, saveStatus, activeTab, setActiveTab }}>
      {children}
    </MatriceContext.Provider>
  );
}

export function useMatrice() {
  const ctx = useContext(MatriceContext);
  if (!ctx) throw new Error('useMatrice must be used inside MatriceProvider');
  return ctx;
}
