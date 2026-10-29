create table if not exists public.support_replies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  request_id uuid not null references public.support_requests(id) on delete cascade,
  sent_by uuid null references auth.users(id) on delete set null,
  to_email text not null,
  from_address text not null,
  subject text not null,
  body text not null,
  provider_message_id text null
);
alter table public.support_replies enable row level security;
-- No policies: only the server (service role) reads or writes this table.
create index if not exists support_replies_request_idx on public.support_replies (request_id, created_at);
