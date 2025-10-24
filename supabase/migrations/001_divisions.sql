-- Tabela de divisões
create table if not exists public.divisions (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('igual','itens')),
  local text not null,
  data date,
  total numeric(12,2) not null,
  taxa numeric(12,2) default 0,
  gorjeta numeric(12,2) default 0,
  criador_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'ativa' check (status in ('ativa','finalizada')),
  created_at timestamptz default now()
);

-- Habilita RLS
alter table public.divisions enable row level security;

-- Políticas: o usuário só vê suas divisões
create policy "divisions select own"
  on public.divisions for select
  using (auth.uid() = criador_id);

-- Políticas: o usuário só insere divisões para si
create policy "divisions insert own"
  on public.divisions for insert
  with check (auth.uid() = criador_id);

-- Políticas: o usuário só atualiza divisões que são suas
create policy "divisions update own"
  on public.divisions for update
  using (auth.uid() = criador_id)
  with check (auth.uid() = criador_id);