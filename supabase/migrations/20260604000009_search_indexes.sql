-- supabase/migrations/20260604000009_search_indexes.sql
-- Index pour accélérer les recherches ILIKE (expression index sur lower())

create index if not exists idx_risques_search on risques using gin(to_tsvector('french', coalesce(danger,'') || ' ' || coalesce(unite_travail,'')));
create index if not exists idx_actions_search on actions using gin(to_tsvector('french', coalesce(action,'') || ' ' || coalesce(pilote,'')));
create index if not exists idx_accidents_search on accidents using gin(to_tsvector('french', coalesce(description_faits,'') || ' ' || coalesce(victime,'')));
create index if not exists idx_habilitations_search on habilitations (lower(employe), lower(domaine));
