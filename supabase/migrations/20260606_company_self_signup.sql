-- Permet à un utilisateur de créer sa propre company (normalement fait via webhook Stripe)
create policy "Créer sa propre company"
  on companies for insert
  with check (admin_user_id = auth.uid());

-- Permet à l'admin de s'ajouter comme premier membre de sa propre company
create policy "Premier membre admin"
  on company_members for insert
  with check (
    user_id = auth.uid()
    and role = 'admin'
    and accepted_at is not null
    and exists (
      select 1 from companies c
      where c.id = company_id
        and c.admin_user_id = auth.uid()
    )
  );
