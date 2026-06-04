-- supabase/migrations/20260604000002_journal_audit.sql

-- Table journal d'audit
create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  table_name  text not null,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  record_id   uuid,
  user_id     uuid references auth.users,
  user_email  text,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz default now()
);

create index on audit_log (company_id, created_at desc);
create index on audit_log (company_id, table_name);

alter table audit_log enable row level security;

create policy "audit_log_select"
  on audit_log for select
  using (company_id = get_user_company_id());

-- Fonction générique de trigger d'audit
create or replace function fn_audit_log()
returns trigger
language plpgsql
security definer
as $$
declare
  v_company_id uuid;
  v_record_id  uuid;
  v_old        jsonb;
  v_new        jsonb;
  v_user_email text;
begin
  if TG_OP = 'DELETE' then
    v_company_id := OLD.company_id;
    v_record_id  := OLD.id;
    v_old        := to_jsonb(OLD);
    v_new        := null;
  elsif TG_OP = 'INSERT' then
    v_company_id := NEW.company_id;
    v_record_id  := NEW.id;
    v_old        := null;
    v_new        := to_jsonb(NEW);
  else -- UPDATE
    v_company_id := NEW.company_id;
    v_record_id  := NEW.id;
    v_old        := to_jsonb(OLD);
    v_new        := to_jsonb(NEW);
  end if;

  select email into v_user_email
  from auth.users
  where id = auth.uid();

  insert into audit_log (company_id, table_name, action, record_id, user_id, user_email, old_data, new_data)
  values (v_company_id, TG_TABLE_NAME, TG_OP, v_record_id, auth.uid(), v_user_email, v_old, v_new);

  return null;
end;
$$;

-- Triggers sur toutes les tables métier
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'risques','actions','accidents','habilitations','kpi_objectifs',
    'objectifs_qhse','reunions_qhse','qualite_audits','qualite_nc',
    'rh_employes','rh_formations'
  ] loop
    execute format(
      'create trigger audit_%I
       after insert or update or delete on %I
       for each row execute function fn_audit_log();',
      tbl, tbl
    );
  end loop;
end;
$$;
