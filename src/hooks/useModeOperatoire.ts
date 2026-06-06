import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { ModeOperatoire, AiSuggestMoPayload, AiSuggestMoResult } from '../types/modesOperatoires';

export interface UseModeOperatoireReturn {
  docs: ModeOperatoire[];
  isLoading: boolean;
  error: string | null;
  saveMo: (mo: Partial<ModeOperatoire>) => Promise<ModeOperatoire>;
  deleteMo: (id: string) => Promise<void>;
  callAiSuggest: (p: AiSuggestMoPayload) => Promise<AiSuggestMoResult>;
  refetch: () => void;
}

export function rowToMo(row: Record<string, unknown>): ModeOperatoire {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    reference: row.reference as string,
    version: row.version as string,
    documentDate: row.document_date as string,
    operationType: row.operation_type as ModeOperatoire['operationType'],
    habilitations: (row.habilitations as string[]) ?? [],
    consignesSSE: (row.consignes_sse as ModeOperatoire['consignesSSE']) ?? { risques: [], reglesSecurite: [], consignesEnv: [], permisRequis: [] },
    epis: (row.epis as ModeOperatoire['epis']) ?? [],
    phases: (row.phases as ModeOperatoire['phases']) ?? { preparation: [], execution: [], finTache: [] },
    urgences: (row.urgences as ModeOperatoire['urgences']) ?? [],
    pointRassemblement: row.point_rassemblement as string | undefined,
    approvers: (row.approvers as ModeOperatoire['approvers']) ?? [],
    revisions: (row.revisions as ModeOperatoire['revisions']) ?? [],
    revisionFrequency: row.revision_frequency as string | undefined,
    status: row.status as ModeOperatoire['status'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function moToRow(mo: Partial<ModeOperatoire>, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  if (mo.id !== undefined) row.id = mo.id;
  if (mo.title !== undefined) row.title = mo.title;
  if (mo.reference !== undefined) row.reference = mo.reference;
  if (mo.version !== undefined) row.version = mo.version;
  if (mo.documentDate !== undefined) row.document_date = mo.documentDate;
  if (mo.operationType !== undefined) row.operation_type = mo.operationType;
  if (mo.habilitations !== undefined) row.habilitations = mo.habilitations;
  if (mo.consignesSSE !== undefined) row.consignes_sse = mo.consignesSSE;
  if (mo.epis !== undefined) row.epis = mo.epis;
  if (mo.phases !== undefined) row.phases = mo.phases;
  if (mo.urgences !== undefined) row.urgences = mo.urgences;
  if (mo.pointRassemblement !== undefined) row.point_rassemblement = mo.pointRassemblement;
  if (mo.approvers !== undefined) row.approvers = mo.approvers;
  if (mo.revisions !== undefined) row.revisions = mo.revisions;
  if (mo.revisionFrequency !== undefined) row.revision_frequency = mo.revisionFrequency;
  if (mo.status !== undefined) row.status = mo.status;
  return row;
}

export function useModeOperatoire(session: Session | null): UseModeOperatoireReturn {
  const [docs, setDocs] = useState<ModeOperatoire[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    if (!session) { setDocs([]); return; }
    setIsLoading(true);
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('modes_operatoires')
        .select('*')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false });
      if (err) throw err;
      setDocs((data ?? []).map((row: Record<string, unknown>) => rowToMo(row)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const saveMo = useCallback(async (mo: Partial<ModeOperatoire>): Promise<ModeOperatoire> => {
    if (!session) throw new Error('Non connecté');
    const row = moToRow(mo, session.user.id);
    const { data: saved, error: err } = await supabase
      .from('modes_operatoires')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (err) throw err;
    const result = rowToMo(saved as Record<string, unknown>);
    setDocs(prev => {
      const idx = prev.findIndex(d => d.id === result.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = result;
        return next;
      }
      return [result, ...prev];
    });
    return result;
  }, [session]);

  const deleteMo = useCallback(async (id: string): Promise<void> => {
    if (!session) throw new Error('Non connecté');
    const { error: err } = await supabase
      .from('modes_operatoires')
      .delete()
      .match({ id, user_id: session.user.id });
    if (err) throw err;
    setDocs(prev => prev.filter(d => d.id !== id));
  }, [session]);

  const callAiSuggest = useCallback(async (p: AiSuggestMoPayload): Promise<AiSuggestMoResult> => {
    const { data, error: err } = await supabase.functions.invoke('ai-suggest-mo', { body: p });
    if (err) throw err;
    if (data?.error) throw new Error(data.error);
    return data as AiSuggestMoResult;
  }, []);

  return {
    docs, isLoading, error,
    saveMo, deleteMo, callAiSuggest,
    refetch: fetchDocs,
  };
}
