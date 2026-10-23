-- Fix: the OUT parameter "day" of RETURNS TABLE(score, day) shadows
-- the column name in ON CONFLICT(player_id,day), which rolled back all scores.
-- The data API function needs to identify the PK constraint instead.
create or replace function public.ss_complete(
  p_run uuid, p_player text, p_score integer, p_outcome text
) returns table(score integer, day date)
language plpgsql security invoker set search_path=public as $$
declare
  v_run public.ss_runs%rowtype;
  v_at timestamptz := now();
  v_day date := (now() at time zone 'Asia/Shanghai')::date;
begin
  if p_score is null or p_score < 0 or p_score > 10000
     or p_outcome not in ('success','failure') then
    raise exception 'invalid input';
  end if;
  select * into v_run from public.ss_runs
    where id=p_run and player_id=p_player for update;
  if not found then raise exception 'run missing' using errcode='P0002'; end if;
  if v_run.completed_at is not null then
    return query select v_run.score,v_run.day; return;
  end if;
  if v_run.started_at < now()-interval '20 minutes' then
    raise exception 'run expired';
  end if;
  update public.ss_runs set completed_at=v_at,score=p_score,day=v_day,outcome=p_outcome
    where id=p_run;
  update public.ss_players set best_score=p_score,best_at=v_at
    where id=p_player and best_score<p_score;
  insert into public.ss_daily_bests(player_id,day,score,achieved_at)
    values(p_player,v_day,p_score,v_at)
    on conflict on constraint ss_daily_bests_pkey
    do update set score=excluded.score,achieved_at=excluded.achieved_at
    where public.ss_daily_bests.score<excluded.score;
  return query select p_score,v_day;
end $$;
revoke execute on function public.ss_complete(uuid,text,integer,text)
  from public,anon,authenticated;
grant execute on function public.ss_complete(uuid,text,integer,text) to service_role;
