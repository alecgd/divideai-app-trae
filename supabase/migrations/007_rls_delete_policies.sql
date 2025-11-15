-- RLS delete policies to allow removing records owned by the user

drop policy if exists "division_participants delete own" on public.division_participants;
create policy "division_participants delete own"
  on public.division_participants for delete
  using (
    exists (
      select 1 from public.divisions d
      where d.id = division_id and d.criador_id = auth.uid()
    )
  );

drop policy if exists "division_items delete own" on public.division_items;
create policy "division_items delete own"
  on public.division_items for delete
  using (
    exists (
      select 1 from public.divisions d
      where d.id = division_id and d.criador_id = auth.uid()
    )
  );

drop policy if exists "division_item_consumers delete own" on public.division_item_consumers;
create policy "division_item_consumers delete own"
  on public.division_item_consumers for delete
  using (
    exists (
      select 1 from public.division_items di
      join public.divisions d on d.id = di.division_id
      where di.id = division_item_id and d.criador_id = auth.uid()
    )
  );
