-- Garante função gen_random_uuid()
create extension if not exists pgcrypto;

-- Tabela de consumo por item (associação item ↔ participante)
create table if not exists public.division_item_consumers (
  id uuid primary key default gen_random_uuid(),
  division_item_id uuid not null references public.division_items(id) on delete cascade,
  participant_id uuid not null references public.division_participants(id) on delete cascade,
  quantidade integer not null default 0,
  created_at timestamptz default now()
);

-- Habilita RLS
alter table public.division_item_consumers enable row level security;

-- Política: selecionar apenas registros de itens de divisões do próprio usuário
create policy "division_item_consumers select own"
  on public.division_item_consumers for select
  using (
    exists (
      select 1 from public.division_items di
      join public.divisions d on d.id = di.division_id
      where di.id = division_item_id and d.criador_id = auth.uid()
    )
  );

-- Política: inserir apenas para itens de divisões do próprio usuário
create policy "division_item_consumers insert own"
  on public.division_item_consumers for insert
  with check (
    exists (
      select 1 from public.division_items di
      join public.divisions d on d.id = di.division_id
      where di.id = division_item_id and d.criador_id = auth.uid()
    )
  );

-- Política: atualizar apenas registros de itens de divisões do próprio usuário
create policy "division_item_consumers update own"
  on public.division_item_consumers for update
  using (
    exists (
      select 1 from public.division_items di
      join public.divisions d on d.id = di.division_id
      where di.id = division_item_id and d.criador_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.division_items di
      join public.divisions d on d.id = di.division_id
      where di.id = division_item_id and d.criador_id = auth.uid()
    )
  );

-- Índices
create index if not exists division_item_consumers_item_id_idx on public.division_item_consumers(division_item_id);
create index if not exists division_item_consumers_participant_id_idx on public.division_item_consumers(participant_id);
