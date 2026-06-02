-- supabase/migrations/20260602000010_companies.sql

-- Table des entreprises clientes
create table if not exists companies (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  siret                text,
  admin_user_id        uuid references auth.users not null,
  stripe_customer_id   text unique,
  subscription_status  text not null default 'pending',
  tool_slug            text not null,
  created_at           timestamptz default now()
);

-- Contrainte : statuts valides
alter table companies
  add constraint companies_status_check
  check (subscription_status in ('pending', 'active', 'lifetime', 'canceled', 'past_due'));

-- Table des membres d'une entreprise
create table if not exists company_members (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid references companies not null,
  user_id           uuid references auth.users,
  email             text not null,
  role              text not null default 'lecteur',
  invitation_token  uuid unique,
  invited_at        timestamptz default now(),
  accepted_at       timestamptz
);

-- Contrainte : rôles valides
alter table company_members
  add constraint company_members_role_check
  check (role in ('admin', 'responsable_qhse', 'direction', 'lecteur', 'operateur'));

-- Index pour performances
create index on company_members (user_id);
create index on company_members (invitation_token) where invitation_token is not null;

-- Fonction helper : retourne le company_id de l'utilisateur courant (actif)
create or replace function get_user_company_id()
returns uuid
language sql
security definer
stable
as $$
  select cm.company_id
  from company_members cm
  join companies c on c.id = cm.company_id
  where cm.user_id = auth.uid()
    and cm.accepted_at is not null
    and c.subscription_status in ('active', 'lifetime')
  limit 1
$$;

-- RLS sur companies
alter table companies enable row level security;

create policy "Lecture membres actifs"
  on companies for select
  using (
    id = get_user_company_id()
    or admin_user_id = auth.uid()
  );

-- RLS sur company_members
alter table company_members enable row level security;

create policy "Lecture membres de sa company"
  on company_members for select
  using (company_id = get_user_company_id());

create policy "Admin peut inviter"
  on company_members for insert
  with check (
    company_id = get_user_company_id()
    and exists (
      select 1 from company_members cm2
      where cm2.company_id = company_id
        and cm2.user_id = auth.uid()
        and cm2.role = 'admin'
        and cm2.accepted_at is not null
    )
  );

create policy "Admin peut modifier les rôles"
  on company_members for update
  using (
    company_id = get_user_company_id()
    and exists (
      select 1 from company_members cm2
      where cm2.company_id = company_id
        and cm2.user_id = auth.uid()
        and cm2.role = 'admin'
        and cm2.accepted_at is not null
    )
  );

-- L'utilisateur peut accepter sa propre invitation (met à jour son user_id + accepted_at)
create policy "Accepter sa propre invitation"
  on company_members for update
  using (
    invitation_token is not null
    and email = (select email from auth.users where id = auth.uid())
  );
