-- Add tool_slug to purchases, backfill existing rows
alter table purchases
  add column if not exists tool_slug text not null default 'politique-sse';
