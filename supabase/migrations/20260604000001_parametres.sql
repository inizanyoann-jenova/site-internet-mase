-- supabase/migrations/20260604000001_parametres.sql
-- Ajout du profil entreprise (siret existe déjà)
alter table companies
  add column if not exists secteur   text,
  add column if not exists adresse   text,
  add column if not exists telephone text,
  add column if not exists logo_url  text;

-- Politique RLS : l'admin peut modifier sa company (drop si déjà créée par 20260602000011)
drop policy if exists "Admin peut modifier sa company" on companies;
create policy "Admin peut modifier sa company"
  on companies for update
  using (admin_user_id = auth.uid())
  with check (admin_user_id = auth.uid());
