-- ============================================================================
-- Season-wide ship numbering (Build Brief Section 5.2)
-- Ships are numbered sequentially across the whole season (year), ordered by
-- date then ship name. Call after any insert/delete/date change.
-- ============================================================================
create or replace function public.resequence_season_numbers(p_year integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with ordered as (
    select id, row_number() over (order by date, ship_name) as rn
    from public.ships
    where year = p_year
  )
  update public.ships s
  set season_number = o.rn
  from ordered o
  where s.id = o.id
    and s.season_number is distinct from o.rn;
end;
$$;

grant execute on function public.resequence_season_numbers(integer) to authenticated;
