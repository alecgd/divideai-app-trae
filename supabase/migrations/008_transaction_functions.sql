-- Funções transacionais para edição de participantes

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
  -- Remove todos os participantes atuais da divisão (RLS garante autoria)
  delete from public.division_participants
  where division_id = division_uuid;

  -- Insere os participantes fornecidos
  if participants is not null then
    insert into public.division_participants (division_id, nome, dependentes)
    select
      division_uuid,
      coalesce(p->>'nome', 'Pessoa')::text,
      coalesce((p->>'dependentes')::int, 0)
    from jsonb_array_elements(participants) as p;
    get diagnostics inserted_count = row_count;
  end if;

  return inserted_count;
exception when others then
  -- Propaga erro para o cliente
  raise;
end;
$$;

comment on function public.edit_division_participants(uuid, jsonb)
  is 'Apaga e reinsere participantes de uma divisão de forma atômica.';

