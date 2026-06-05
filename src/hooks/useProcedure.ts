// src/hooks/useProcedure.ts
import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type {
  ProcedureDoc,
  GenerateProcedureStepsPayload,
  GenerateProcedureStepsResult,
  AiSuggestProcedurePayload,
  AiSuggestProcedureResult,
} from '../types/procedures';

export interface UseProcedureReturn {
  docs: ProcedureDoc[];
  isLoading: boolean;
  error: string | null;
  saveProcedure: (doc: Partial<ProcedureDoc>) => Promise<ProcedureDoc>;
  deleteProcedure: (id: string) => Promise<void>;
  callGenerateSteps: (p: GenerateProcedureStepsPayload) => Promise<GenerateProcedureStepsResult>;
  callAiSuggest: (p: AiSuggestProcedurePayload) => Promise<AiSuggestProcedureResult>;
  refetch: () => void;
}

function rowToDoc(row: Record<string, unknown>): ProcedureDoc {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    reference: row.reference as string,
    version: row.version as string,
    documentDate: row.document_date as string,
    direction: row.direction as string,
    responsible: row.responsible as string,
    status: row.status as ProcedureDoc['status'],
    processParent: row.process_parent as string,
    mapId: row.map_id as string | undefined,
    objective: row.objective as string,
    domain: row.domain as string,
    docsIn: row.docs_in as string,
    docsOut: row.docs_out as string,
    kpi: row.kpi as string,
    steps: (row.steps as ProcedureDoc['steps']) ?? [],
    risks: (row.risks as ProcedureDoc['risks']) ?? [],
    approvers: (row.approvers as ProcedureDoc['approvers']) ?? [],
    revisions: (row.revisions as ProcedureDoc['revisions']) ?? [],
    revisionFrequency: row.revision_frequency as string | undefined,
    phaseCompleted: (row.phase_completed as boolean) ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function docToRow(doc: Partial<ProcedureDoc>, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  if (doc.id !== undefined) row.id = doc.id;
  if (doc.title !== undefined) row.title = doc.title;
  if (doc.reference !== undefined) row.reference = doc.reference;
  if (doc.version !== undefined) row.version = doc.version;
  if (doc.documentDate !== undefined) row.document_date = doc.documentDate;
  if (doc.direction !== undefined) row.direction = doc.direction;
  if (doc.responsible !== undefined) row.responsible = doc.responsible;
  if (doc.status !== undefined) row.status = doc.status;
  if (doc.processParent !== undefined) row.process_parent = doc.processParent;
  if (doc.mapId !== undefined) row.map_id = doc.mapId;
  if (doc.objective !== undefined) row.objective = doc.objective;
  if (doc.domain !== undefined) row.domain = doc.domain;
  if (doc.docsIn !== undefined) row.docs_in = doc.docsIn;
  if (doc.docsOut !== undefined) row.docs_out = doc.docsOut;
  if (doc.kpi !== undefined) row.kpi = doc.kpi;
  if (doc.steps !== undefined) row.steps = doc.steps;
  if (doc.risks !== undefined) row.risks = doc.risks;
  if (doc.approvers !== undefined) row.approvers = doc.approvers;
  if (doc.revisions !== undefined) row.revisions = doc.revisions;
  if (doc.revisionFrequency !== undefined) row.revision_frequency = doc.revisionFrequency;
  if (doc.phaseCompleted !== undefined) row.phase_completed = doc.phaseCompleted;
  return row;
}

export function useProcedure(session: Session | null): UseProcedureReturn {
  const [docs, setDocs] = useState<ProcedureDoc[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    if (!session) { setDocs([]); return; }
    setIsLoading(true);
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('procedure_docs')
        .select('*')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false });
      if (err) throw err;
      setDocs((data ?? []).map((row: Record<string, unknown>) => rowToDoc(row)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const saveProcedure = useCallback(async (doc: Partial<ProcedureDoc>): Promise<ProcedureDoc> => {
    if (!session) throw new Error('Non connecté');
    const row = docToRow(doc, session.user.id);
    const { data: saved, error: err } = await supabase
      .from('procedure_docs')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (err) throw err;
    const result = rowToDoc(saved as Record<string, unknown>);
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

  const deleteProcedure = useCallback(async (id: string): Promise<void> => {
    if (!session) throw new Error('Non connecté');
    const { error: err } = await supabase
      .from('procedure_docs')
      .delete()
      .match({ id, user_id: session.user.id });
    if (err) throw err;
    setDocs(prev => prev.filter(d => d.id !== id));
  }, [session]);

  const callEdge = useCallback(async <T>(name: string, payload: unknown): Promise<T> => {
    const { data, error: err } = await supabase.functions.invoke(name, { body: payload });
    if (err) throw err;
    if (data?.error) throw new Error(data.error);
    return data as T;
  }, []);

  const callGenerateSteps = useCallback(
    (p: GenerateProcedureStepsPayload) => callEdge<GenerateProcedureStepsResult>('generate-procedure-steps', p),
    [callEdge],
  );

  const callAiSuggest = useCallback(
    (p: AiSuggestProcedurePayload) => callEdge<AiSuggestProcedureResult>('ai-suggest-procedure', p),
    [callEdge],
  );

  return {
    docs, isLoading, error,
    saveProcedure, deleteProcedure,
    callGenerateSteps, callAiSuggest,
    refetch: fetchDocs,
  };
}
