-- Tabela de telemetria de eventos do app
create extension if not exists pgcrypto;

create table if not exists public.event_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  division_id uuid references public.divisions(id) on delete set null,
  screen text not null,
  action text not null,
  success boolean not null,
  payload jsonb,
  error text,
  created_at timestamptz default now()
);

-- Habilita RLS
alter table public.event_logs enable row level security;

-- Políticas: o usuário só vê seus próprios logs
drop policy if exists "event_logs select own" on public.event_logs;
create policy "event_logs select own"
  on public.event_logs for select
  using (auth.uid() = user_id);

-- Políticas: o usuário só insere seus próprios logs
drop policy if exists "event_logs insert own" on public.event_logs;
create policy "event_logs insert own"
  on public.event_logs for insert
  with check (auth.uid() = user_id);

-- Índices
create index if not exists event_logs_user_created_idx on public.event_logs(user_id, created_at);

