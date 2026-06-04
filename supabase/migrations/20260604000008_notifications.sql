-- supabase/migrations/20260604000008_notifications.sql

create table if not exists notification_preferences (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references companies(id) on delete cascade,
  notif_habilitations   boolean not null default true,
  hab_jours_avant       int[] not null default '{30,14,7}',
  notif_actions_retard  boolean not null default true,
  notif_reunions        boolean not null default false,
  reunions_jours_avant  int not null default 3,
  emails_destinataires  text not null default '',
  heure_envoi           text not null default '07:00',
  updated_at            timestamptz default now(),
  unique (company_id)
);

alter table notification_preferences enable row level security;

create policy "notif_pref_select" on notification_preferences for select using (company_id = get_user_company_id());
create policy "notif_pref_insert" on notification_preferences for insert with check (company_id = get_user_company_id());
create policy "notif_pref_update" on notification_preferences for update using (company_id = get_user_company_id());
