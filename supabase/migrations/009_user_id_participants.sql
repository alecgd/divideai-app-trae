-- Add optional user_id to division_participants and update transactional function

alter table public.division_participants
  add column if not exists user_id uuid references public.profiles(user_id) on delete set null;

-- Recreate transactional function to accept user_id in payload
create or replace function public.edit_division_participants(
  division_uuid uuid,
  participants jsonb
)
returns integer
language plpgsql
security invoker
as $$
declare
  inserted_count integer := 0;
begin
  delete from public.division_participants
  where division_id = division_uuid;

  if participants is not null then
    insert into public.division_participants (division_id, nome, dependentes, user_id)
    select
      division_uuid,
      coalesce(p->>'nome', 'Pessoa')::text,
      coalesce((p->>'dependentes')::int, 0),
      case
        when coalesce(p->>'user_id', '') = '' then null
        else (p->>'user_id')::uuid
      end
    from jsonb_array_elements(participants) as p;
    get diagnostics inserted_count = row_count;
  end if;

  return inserted_count;
exception when others then
  raise;
end;
$$;

comment on function public.edit_division_participants(uuid, jsonb)
  is 'Apaga e reinsere participantes de uma divisão de forma atômica (suporta user_id opcional).';
