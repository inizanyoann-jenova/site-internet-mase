-- supabase/migrations/20260605000000_process_maps.sql

-- Table principale : une cartographie par utilisateur (modifiable chaque année)
CREATE TABLE IF NOT EXISTS public.process_maps (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name      text NOT NULL,
  sector            text NOT NULL DEFAULT '',
  headcount         integer NOT NULL DEFAULT 0,
  sse_manager_name  text NOT NULL DEFAULT '',
  sse_manager_role  text NOT NULL DEFAULT '',
  document_date     date NOT NULL DEFAULT CURRENT_DATE,
  phase_1_completed boolean NOT NULL DEFAULT false,
  phase_2_completed boolean NOT NULL DEFAULT false,
  cartography_data  jsonb NOT NULL DEFAULT '{"processes":[]}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Table des fiches de processus (une par processus de la cartographie)
CREATE TABLE IF NOT EXISTS public.process_sheets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id              uuid NOT NULL REFERENCES public.process_maps(id) ON DELETE CASCADE,
  process_type        text NOT NULL CHECK (process_type IN ('pilotage','realisation','support')),
  process_name        text NOT NULL,
  pilot_name          text NOT NULL DEFAULT '',
  pilot_role          text NOT NULL DEFAULT '',
  participants        text[] NOT NULL DEFAULT '{}',
  purpose             text NOT NULL DEFAULT '',
  inputs              jsonb NOT NULL DEFAULT '[]'::jsonb,
  activities          jsonb NOT NULL DEFAULT '[]'::jsonb,
  outputs             jsonb NOT NULL DEFAULT '[]'::jsonb,
  resources           jsonb NOT NULL DEFAULT '[]'::jsonb,
  smart_objective     jsonb NOT NULL DEFAULT '{}'::jsonb,
  kpi_lagging         text NOT NULL DEFAULT '',
  kpi_leading         text NOT NULL DEFAULT '',
  risks               jsonb NOT NULL DEFAULT '[]'::jsonb,
  documents           text[] NOT NULL DEFAULT '{}',
  revision_frequency  text NOT NULL DEFAULT 'Annuelle',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- RLS process_maps
ALTER TABLE public.process_maps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "process_maps: lecture utilisateur" ON public.process_maps;
CREATE POLICY "process_maps: lecture utilisateur"
  ON public.process_maps FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "process_maps: insertion utilisateur" ON public.process_maps;
CREATE POLICY "process_maps: insertion utilisateur"
  ON public.process_maps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "process_maps: mise à jour utilisateur" ON public.process_maps;
CREATE POLICY "process_maps: mise à jour utilisateur"
  ON public.process_maps FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "process_maps: suppression utilisateur" ON public.process_maps;
CREATE POLICY "process_maps: suppression utilisateur"
  ON public.process_maps FOR DELETE
  USING (auth.uid() = user_id);

-- RLS process_sheets (via JOIN sur process_maps)
ALTER TABLE public.process_sheets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "process_sheets: lecture utilisateur" ON public.process_sheets;
CREATE POLICY "process_sheets: lecture utilisateur"
  ON public.process_sheets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.process_maps
      WHERE process_maps.id = process_sheets.map_id
        AND process_maps.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "process_sheets: insertion utilisateur" ON public.process_sheets;
CREATE POLICY "process_sheets: insertion utilisateur"
  ON public.process_sheets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.process_maps
      WHERE process_maps.id = process_sheets.map_id
        AND process_maps.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "process_sheets: mise à jour utilisateur" ON public.process_sheets;
CREATE POLICY "process_sheets: mise à jour utilisateur"
  ON public.process_sheets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.process_maps
      WHERE process_maps.id = process_sheets.map_id
        AND process_maps.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "process_sheets: suppression utilisateur" ON public.process_sheets;
CREATE POLICY "process_sheets: suppression utilisateur"
  ON public.process_sheets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.process_maps
      WHERE process_maps.id = process_sheets.map_id
        AND process_maps.user_id = auth.uid()
    )
  );

-- Trigger updated_at automatique
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS process_maps_updated_at ON public.process_maps;
CREATE TRIGGER process_maps_updated_at
  BEFORE UPDATE ON public.process_maps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS process_sheets_updated_at ON public.process_sheets;
CREATE TRIGGER process_sheets_updated_at
  BEFORE UPDATE ON public.process_sheets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
