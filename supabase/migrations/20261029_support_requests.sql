create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid null references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  topic text not null,
  message text not null,
  status text not null default 'new' check (status in ('new','in_progress','resolved'))
);
alter table public.support_requests enable row level security;
-- No policies: only the server (service role) reads or writes this table.
create index if not exists support_requests_created_idx on public.support_requests (created_at desc);
