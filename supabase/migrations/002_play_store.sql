-- Adiciona colunas para rastreamento de assinaturas da Play Store
alter table public.users
  add column if not exists play_store_token text,
  add column if not exists play_store_product_id text;

-- Índice para busca rápida por token
create index if not exists idx_users_play_store_token 
  on public.users(play_store_token);

-- RLS policies para as novas colunas
alter table public.users enable row level security;

create policy "Usuários podem ver seus próprios dados da Play Store"
  on public.users for select
  using (auth.uid() = id);

create policy "Usuários podem atualizar seus próprios dados da Play Store"
  on public.users for update
  using (auth.uid() = id);
