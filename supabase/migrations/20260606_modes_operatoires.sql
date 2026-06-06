CREATE TABLE IF NOT EXISTS modes_operatoires (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid REFERENCES auth.users NOT NULL,
  title                text NOT NULL,
  reference            text,
  version              text DEFAULT 'V1.0',
  document_date        date,
  operation_type       text NOT NULL,
  habilitations        text[] DEFAULT '{}',
  consignes_sse        jsonb DEFAULT '{}',
  epis                 jsonb DEFAULT '[]',
  phases               jsonb DEFAULT '{"preparation":[],"execution":[],"finTache":[]}',
  urgences             jsonb DEFAULT '[]',
  point_rassemblement  text,
  approvers            jsonb DEFAULT '[]',
  revisions            jsonb DEFAULT '[]',
  revision_frequency   text,
  status               text DEFAULT 'brouillon',
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE modes_operatoires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own their modes operatoires"
  ON modes_operatoires FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
