-- Garante função gen_random_uuid()
create extension if not exists pgcrypto;

-- Tabela de participantes da divisão
create table if not exists public.division_participants (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.divisions(id) on delete cascade,
  nome text not null,
  dependentes integer not null default 0,
  created_at timestamptz default now()
);

-- Habilita RLS
alter table public.division_participants enable row level security;

-- Políticas: o usuário só vê participantes de suas divisões
create policy "division_participants select own"
  on public.division_participants for select
  using (
    exists (
      select 1 from public.divisions d
      where d.id = division_id and d.criador_id = auth.uid()
    )
  );

-- Políticas: o usuário só insere participantes em suas divisões
create policy "division_participants insert own"
  on public.division_participants for insert
  with check (
    exists (
      select 1 from public.divisions d
      where d.id = division_id and d.criador_id = auth.uid()
    )
  );

-- Políticas: o usuário só atualiza participantes de suas divisões
create policy "division_participants update own"
  on public.division_participants for update
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
create index if not exists division_participants_division_id_idx on public.division_participants(division_id);
