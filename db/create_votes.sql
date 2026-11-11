-- Milestone 6: one vote per user per joke.

create table public.votes (
  user_id uuid not null references auth.users (id) on delete cascade,
  joke_id uuid not null references public.jokes (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  voted_at timestamptz not null default now(),
  primary key (user_id, joke_id)
);

create index votes_joke_id_idx on public.votes (joke_id);

alter table public.votes enable row level security;

revoke all on table public.votes from anon, authenticated, service_role;
grant select, insert, update, delete on table public.votes to service_role;

-- 1 or -1: set my vote. 0: remove it. Returns the joke's totals and my vote (0 = none).
create function public.cast_vote(voter uuid, target uuid, new_value smallint)
returns table (likes integer, dislikes integer, my_vote smallint)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if voter is null then
    raise exception 'voter is required' using errcode = '22023';
  end if;
  if new_value is null or new_value not in (-1, 0, 1) then
    raise exception 'value must be -1, 0 or 1' using errcode = '22023';
  end if;
  if not exists (select 1 from public.jokes j where j.id = target) then
    raise exception 'joke not found' using errcode = 'P0002';
  end if;

  if new_value = 0 then
    delete from public.votes v
    where v.user_id = voter and v.joke_id = target;
  else
    insert into public.votes as v (user_id, joke_id, value, voted_at)
    values (voter, target, new_value, now())
    on conflict (user_id, joke_id)
    do update set value = excluded.value, voted_at = excluded.voted_at;
  end if;

  return query
  select
    (count(*) filter (where v.value = 1))::integer,
    (count(*) filter (where v.value = -1))::integer,
    coalesce(max(v.value) filter (where v.user_id = voter), 0)::smallint
  from public.votes v
  where v.joke_id = target;
end;
$$;

-- new: newest first. top: at least one like, by likes minus dislikes, then likes.
-- liked: what the viewer liked, by when. viewer is null for a guest.
create function public.joke_feed(viewer uuid, mode text, max_rows integer default 20)
returns table (
  id uuid,
  created_at timestamptz,
  topic text,
  text text,
  author_name text,
  likes integer,
  dislikes integer,
  my_vote smallint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with counts as (
    select
      v.joke_id,
      (count(*) filter (where v.value = 1))::integer as likes,
      (count(*) filter (where v.value = -1))::integer as dislikes
    from public.votes v
    group by v.joke_id
  )
  select
    j.id,
    j.created_at,
    j.topic,
    j.text,
    j.author_name,
    coalesce(c.likes, 0),
    coalesce(c.dislikes, 0),
    coalesce(mine.value, 0)::smallint
  from public.jokes j
  left join counts c on c.joke_id = j.id
  left join public.votes mine
    on mine.joke_id = j.id and mine.user_id = joke_feed.viewer
  where case joke_feed.mode
    when 'new' then true
    when 'top' then coalesce(c.likes, 0) >= 1
    when 'liked' then mine.value = 1
    else false
  end
  order by
    case when joke_feed.mode = 'liked' then mine.voted_at end desc nulls last,
    case when joke_feed.mode = 'top' then coalesce(c.likes, 0) - coalesce(c.dislikes, 0) end desc nulls last,
    case when joke_feed.mode = 'top' then coalesce(c.likes, 0) end desc nulls last,
    j.created_at desc nulls last,
    j.id
  limit least(greatest(coalesce(joke_feed.max_rows, 20), 1), 50);
$$;

revoke execute on function public.cast_vote(uuid, uuid, smallint) from public, anon, authenticated;
grant execute on function public.cast_vote(uuid, uuid, smallint) to service_role;

revoke execute on function public.joke_feed(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.joke_feed(uuid, text, integer) to service_role;
