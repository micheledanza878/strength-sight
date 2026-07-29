-- food_equivalences (and substitution_groups/foods) are write-only via
-- service_role — see foods_write_service_role / food_equivalences_write_service_role
-- RLS policies. The new substitution-management UI runs as a normal
-- authenticated client, so it needs SECURITY DEFINER RPCs to create/update/
-- remove equivalence rows, same pattern as import_diet_plan.

create or replace function public.upsert_food_equivalence(
  p_group_id uuid,
  p_food_id uuid,
  p_base_quantity_g numeric
)
returns food_equivalences
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result food_equivalences;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into food_equivalences (group_id, food_id, base_quantity_g)
  values (p_group_id, p_food_id, p_base_quantity_g)
  on conflict (group_id, food_id)
  do update set base_quantity_g = excluded.base_quantity_g
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.upsert_food_equivalence(uuid, uuid, numeric) from public;
grant execute on function public.upsert_food_equivalence(uuid, uuid, numeric) to authenticated;

create or replace function public.delete_food_equivalence(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from food_equivalences where id = p_id;
end;
$$;

revoke all on function public.delete_food_equivalence(uuid) from public;
grant execute on function public.delete_food_equivalence(uuid) to authenticated;
