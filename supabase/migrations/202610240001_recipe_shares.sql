-- Only intentionally shared snapshots are public, through a random token.
create table public.recipe_share (
  token uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null check (octet_length(snapshot::text) <= 128000),
  created_at timestamptz not null default now()
);
create index recipe_share_owner_created_idx on public.recipe_share(owner_id, created_at);
alter table public.recipe_share enable row level security;
revoke all on public.recipe_share from public, anon, authenticated;

create function public.create_recipe_share(p_snapshot jsonb)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_token uuid;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if jsonb_typeof(p_snapshot) is distinct from 'object'
     or p_snapshot->>'version' is distinct from '1'
     or jsonb_typeof(p_snapshot->'title') is distinct from 'string'
     or length(trim(p_snapshot->>'title')) not between 1 and 300
     or jsonb_typeof(p_snapshot->'ingredients') is distinct from 'array'
     or jsonb_typeof(p_snapshot->'instructions') is distinct from 'array'
     or octet_length(p_snapshot::text) > 128000 then
    raise exception 'Invalid recipe snapshot' using errcode = '22023';
  end if;
  if jsonb_array_length(p_snapshot->'ingredients') not between 1 and 200
     or jsonb_array_length(p_snapshot->'instructions') not between 1 and 100 then
    raise exception 'Invalid recipe snapshot' using errcode = '22023';
  end if;
  -- Serialize quota checks per owner so concurrent calls cannot bypass the cap.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  if (select count(*) from public.recipe_share
      where owner_id = v_user and created_at >= now() - interval '1 day') >= 50 then
    raise exception 'Daily recipe sharing limit reached' using errcode = '54000';
  end if;
  insert into public.recipe_share(owner_id, snapshot) values (v_user, p_snapshot)
  returning token into v_token;
  return v_token;
end;
$$;
revoke all on function public.create_recipe_share(jsonb) from public, anon;
grant execute on function public.create_recipe_share(jsonb) to authenticated;

-- No enumeration endpoint and no owner identity in the response.
create function public.get_recipe_share(p_token uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$ select snapshot from public.recipe_share where token = p_token; $$;
revoke all on function public.get_recipe_share(uuid) from public;
grant execute on function public.get_recipe_share(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
