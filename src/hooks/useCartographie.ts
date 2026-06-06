// src/hooks/useCartographie.ts
import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type {
  ProcessMap, ProcessSheet,
  GenerateProcessMapPayload, GenerateProcessMapResult,
  ReformulateSmartPayload, ReformulateSmartResult,
  AiAssistPayload, AiAssistResult,
} from '../types/cartographie';

export interface UseCartographieReturn {
  map: ProcessMap | null;
  isLoading: boolean;
  error: string | null;
  saveMap: (data: Partial<ProcessMap>) => Promise<ProcessMap>;
  saveSheet: (sheet: Omit<ProcessSheet, 'id'> & { id?: string }) => Promise<ProcessSheet>;
  getSheets: (mapId: string) => Promise<ProcessSheet[]>;
  callGenerateProcessMap: (payload: GenerateProcessMapPayload) => Promise<GenerateProcessMapResult>;
  callReformulateSmart: (payload: ReformulateSmartPayload) => Promise<ReformulateSmartResult>;
  callAiAssist: (payload: AiAssistPayload) => Promise<AiAssistResult>;
  refetch: () => void;
}

function dbRowToMap(row: Record<string, unknown>): ProcessMap {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    companyName: row.company_name as string,
    sector: row.sector as string,
    headcount: row.headcount as number,
    sseManagerName: row.sse_manager_name as string,
    sseManagerRole: row.sse_manager_role as string,
    documentDate: row.document_date as string,
    phase1Completed: row.phase_1_completed as boolean,
    phase2Completed: row.phase_2_completed as boolean,
    cartographyData: (row.cartography_data as ProcessMap['cartographyData']) ?? { processes: [] },
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapToDbRow(map: Partial<ProcessMap>, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  if (map.companyName !== undefined) row.company_name = map.companyName;
  if (map.sector !== undefined) row.sector = map.sector;
  if (map.headcount !== undefined) row.headcount = map.headcount;
  if (map.sseManagerName !== undefined) row.sse_manager_name = map.sseManagerName;
  if (map.sseManagerRole !== undefined) row.sse_manager_role = map.sseManagerRole;
  if (map.documentDate !== undefined) row.document_date = map.documentDate;
  if (map.phase1Completed !== undefined) row.phase_1_completed = map.phase1Completed;
  if (map.phase2Completed !== undefined) row.phase_2_completed = map.phase2Completed;
  if (map.cartographyData !== undefined) row.cartography_data = map.cartographyData;
  if (map.id !== undefined) row.id = map.id;
  return row;
}

export function useCartographie(session: Session | null): UseCartographieReturn {
  const [map, setMap] = useState<ProcessMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMap = useCallback(async () => {
    if (!session) { setMap(null); return; }
    setIsLoading(true);
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('process_maps')
        .select('*')
        .eq('user_id', session.user.id)
        .limit(1)
        .maybeSingle();
      if (err) throw err;
      setMap(data ? dbRowToMap(data as Record<string, unknown>) : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => { fetchMap(); }, [fetchMap]);

  const saveMap = useCallback(async (data: Partial<ProcessMap>): Promise<ProcessMap> => {
    if (!session) throw new Error('Non connecté');
    const row = mapToDbRow(data, session.user.id);
    const { data: saved, error: err } = await supabase
      .from('process_maps')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (err) throw err;
    const result = dbRowToMap(saved as Record<string, unknown>);
    setMap(result);
    return result;
  }, [session]);

  const saveSheet = useCallback(async (sheet: Omit<ProcessSheet, 'id'> & { id?: string }): Promise<ProcessSheet> => {
    const row: Record<string, unknown> = {
      map_id: sheet.mapId,
      process_type: sheet.process.type,
      process_name: sheet.process.name,
      pilot_name: sheet.process.pilotName,
      pilot_role: sheet.process.pilotRole,
      participants: sheet.participants,
      purpose: sheet.purpose,
      inputs: sheet.inputs,
      activities: sheet.activities,
      outputs: sheet.outputs,
      resources: sheet.resources,
      smart_objective: sheet.smartObjective,
      kpi_lagging: sheet.kpiLagging,
      kpi_leading: sheet.kpiLeading,
      risks: sheet.risks,
      documents: sheet.documents,
      revision_frequency: sheet.revisionFrequency,
    };
    if (sheet.id !== undefined) row.id = sheet.id;
    const { data, error: err } = await supabase
      .from('process_sheets')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (err) throw err;
    return { ...sheet, id: (data as Record<string, unknown>).id as string };
  }, []);

  const getSheets = useCallback(async (mapId: string): Promise<ProcessSheet[]> => {
    const { data, error: err } = await supabase
      .from('process_sheets')
      .select('*')
      .eq('map_id', mapId);
    if (err) throw err;
    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      mapId: row.map_id as string,
      process: {
        id: '',
        type: row.process_type as ProcessSheet['process']['type'],
        name: row.process_name as string,
        pilotName: row.pilot_name as string,
        pilotRole: row.pilot_role as string,
      },
      participants: (row.participants as string[]) ?? [],
      purpose: (row.purpose as string) ?? '',
      inputs: (row.inputs as string[]) ?? [],
      activities: (row.activities as string[]) ?? [],
      outputs: (row.outputs as string[]) ?? [],
      resources: (row.resources as string[]) ?? [],
      smartObjective: (row.smart_objective as ProcessSheet['smartObjective']) ?? {
        rawText: '', objectiveText: '', indicator: '', target: '', frequency: '', deadline: '',
      },
      kpiLagging: (row.kpi_lagging as string) ?? '',
      kpiLeading: (row.kpi_leading as string) ?? '',
      risks: (row.risks as string[]) ?? [],
      documents: (row.documents as string[]) ?? [],
      revisionFrequency: (row.revision_frequency as string) ?? 'Annuelle',
    }));
  }, []);

  const callEdgeFunction = useCallback(async <T>(
    name: string,
    payload: unknown,
  ): Promise<T> => {
    const { data, error: err } = await supabase.functions.invoke(name, { body: payload });
    if (err) throw err;
    if (data?.error) throw new Error(data.error);
    return data as T;
  }, []);

  const callGenerateProcessMap = useCallback(
    (p: GenerateProcessMapPayload) => callEdgeFunction<GenerateProcessMapResult>('generate-process-map', p),
    [callEdgeFunction],
  );

  const callReformulateSmart = useCallback(
    (p: ReformulateSmartPayload) => callEdgeFunction<ReformulateSmartResult>('reformulate-smart', p),
    [callEdgeFunction],
  );

  const callAiAssist = useCallback(
    (p: AiAssistPayload) => callEdgeFunction<AiAssistResult>('ai-assist-process', p),
    [callEdgeFunction],
  );

  return {
    map, isLoading, error,
    saveMap, saveSheet, getSheets,
    callGenerateProcessMap, callReformulateSmart, callAiAssist,
    refetch: fetchMap,
  };
}
