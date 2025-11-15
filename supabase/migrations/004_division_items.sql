-- Garante função gen_random_uuid()
create extension if not exists pgcrypto;

-- Tabela de itens da divisão
create table if not exists public.division_items (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.divisions(id) on delete cascade,
  nome text not null,
  preco numeric(12,2) not null,
  quantidade integer not null default 1,
  created_at timestamptz default now()
);

-- Habilita RLS
alter table public.division_items enable row level security;

-- Políticas: o usuário só vê itens de suas divisões
create policy "division_items select own"
  on public.division_items for select
  using (
    exists (
      select 1 from public.divisions d
      where d.id = division_id and d.criador_id = auth.uid()
    )
  );

-- Políticas: o usuário só insere itens em suas divisões
create policy "division_items insert own"
  on public.division_items for insert
  with check (
    exists (
      select 1 from public.divisions d
      where d.id = division_id and d.criador_id = auth.uid()
    )
  );

-- Políticas: o usuário só atualiza itens de suas divisões
create policy "division_items update own"
  on public.division_items for update
  using (
    exists (
      select 1 from public.divisions d
      where d.id = division_id and d.criador_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.divisions d
      where d.id = division_id and d.criador_id = auth.uid()
    )
  );

-- Índice para performance em consultas por divisão
create index if not exists division_items_division_id_idx on public.division_items(division_id);
