-- supabase/migrations/20260602000011_companies_security_fixes.sql
-- Fix RLS security issues found in 20260602000010_companies.sql

-- Fix 1 (Critical) — "Admin peut inviter" — ambiguous column reference
-- The INSERT policy's EXISTS subquery used bare `company_id` which is ambiguous.
-- Replace with get_user_company_id().

drop policy if exists "Admin peut inviter" on company_members;

create policy "Admin peut inviter"
  on company_members for insert
  with check (
    company_id = get_user_company_id()
    and exists (
      select 1 from company_members cm2
      where cm2.company_id = get_user_company_id()
        and cm2.user_id = auth.uid()
        and cm2.role = 'admin'
        and cm2.accepted_at is not null
    )
  );

-- Fix 2 (Critical) — "Accepter sa propre invitation" — add WITH CHECK to prevent privilege escalation
-- The UPDATE policy had no WITH CHECK, allowing a user to change their own role.
-- Add a WITH CHECK that constrains the new row.

drop policy if exists "Accepter sa propre invitation" on company_members;

create policy "Accepter sa propre invitation"
  on company_members for update
  using (
    invitation_token is not null
    and email = (select email from auth.users where id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    and invitation_token is null
    and accepted_at is not null
  );

-- Fix 3 (Critical) — Missing DELETE policy on company_members
-- Without this, admins cannot revoke team members (silent failure).

create policy "Admin peut révoquer"
  on company_members for delete
  using (
    company_id = get_user_company_id()
    and exists (
      select 1 from company_members cm2
      where cm2.company_id = get_user_company_id()
        and cm2.user_id = auth.uid()
        and cm2.role = 'admin'
        and cm2.accepted_at is not null
    )
  );

-- Fix 4 (Important) — Missing UPDATE policy on companies (for onboarding)
-- Without this, the onboarding page cannot save the company name.

create policy "Admin peut modifier sa company"
  on companies for update
  using (admin_user_id = auth.uid())
  with check (admin_user_id = auth.uid());

-- Fix 5 (Important) — set search_path on get_user_company_id()
-- Replace the function to add `set search_path = ''` and qualify table names.

create or replace function get_user_company_id()
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select cm.company_id
  from public.company_members cm
  join public.companies c on c.id = cm.company_id
  where cm.user_id = auth.uid()
    and cm.accepted_at is not null
    and c.subscription_status in ('active', 'lifetime')
  limit 1
$$;

-- Fix 6 (Important) — add index on companies(admin_user_id)

create index if not exists companies_admin_user_id_idx on companies (admin_user_id);
