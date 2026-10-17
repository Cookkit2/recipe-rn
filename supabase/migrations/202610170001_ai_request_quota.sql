-- AI calls require an authenticated (including anonymous) user and a daily quota.
create table if not exists public.ai_request_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  usage_day date not null default ((now() at time zone 'UTC')::date),
  request_count integer not null default 0 check (request_count >= 0)
);

alter table public.ai_request_usage enable row level security;
revoke all on public.ai_request_usage from anon, authenticated;

create or replace function public.consume_ai_request(p_user_id uuid, p_limit integer default 200)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_count integer;
  today date := (now() at time zone 'UTC')::date;
begin
  if p_limit < 1 or p_limit > 1000 then
    return false;
  end if;
  insert into public.ai_request_usage as usage (user_id, usage_day, request_count)
  values (p_user_id, today, 1)
  on conflict (user_id) do update
  set usage_day = today,
      request_count = case when usage.usage_day = today
        then usage.request_count + 1 else 1 end
  returning request_count into new_count;
  return new_count <= p_limit;
end;
$$;

revoke all on function public.consume_ai_request(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_request(uuid, integer) to service_role;
