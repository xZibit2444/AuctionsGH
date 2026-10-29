-- Additive, nullable phone spec fields. No existing rows change.
-- Applied to production on 2026-10-29 via the SQL editor (with lock_timeout 3s).
begin;
set local lock_timeout = '3s';
set local statement_timeout = '15s';
alter table public.auctions
  add column if not exists battery_health smallint null,
  add column if not exists sim_type text null,
  add column if not exists network_lock text null,
  add column if not exists faults text null;
alter table public.auctions add constraint auctions_battery_health_range check (battery_health is null or (battery_health between 0 and 100)) not valid;
alter table public.auctions add constraint auctions_sim_type_values check (sim_type is null or sim_type in ('physical_sim','esim','dual_sim')) not valid;
alter table public.auctions add constraint auctions_network_lock_values check (network_lock is null or network_lock in ('unlocked','locked','unknown')) not valid;
alter table public.auctions add constraint auctions_faults_length check (faults is null or char_length(faults) <= 500) not valid;
commit;
