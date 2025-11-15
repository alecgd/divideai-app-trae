-- Habilita extensão para storage
create extension if not exists "uuid-ossp";

-- Bucket para comprovantes
insert into storage.buckets (id, name, public)
values ('comprovantes', 'comprovantes', false);

-- Política de storage
create policy "Usuários podem fazer upload de seus comprovantes"
  on storage.objects for insert
  with check (
    bucket_id = 'comprovantes' and
    auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "Usuários podem ver seus comprovantes"
  on storage.objects for select
  using (
    bucket_id = 'comprovantes' and
    auth.uid() = (storage.foldername(name))[1]::uuid
  );

-- Adiciona coluna para comprovante na tabela de divisões
alter table public.divisions
  add column comprovante_url text,
  add column comprovante_path text;
