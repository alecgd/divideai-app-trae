import { supabase } from '../lib/supabaseClient';

export type NewEqualDivisionInput = {
  tipo: 'igual';
  local: string;
  data?: string; // ISO date yyyy-mm-dd
  total: number;
  taxa: number;
  gorjeta: number;
  comprovante_url?: string;
  comprovante_path?: string;
};

export type NewItemsDivisionInput = {
  tipo: 'itens';
  local: string;
  data?: string; // ISO date yyyy-mm-dd
  total: number;
  taxa: number;
  gorjeta: number;
  comprovante_url?: string;
  comprovante_path?: string;
};

export type DivisionItem = {
  id?: string;
  division_id: string;
  nome: string;
  preco: number;
  quantidade: number;
};

export type DivisionItemConsumer = {
  id?: string;
  division_item_id: string;
  participant_id: string;
  quantidade: number;
};

export async function canCreateDivisionThisMonth(): Promise<{ allowed: boolean; used: number; limit: number }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return { allowed: false, used: 0, limit: 10 };

  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(start.getMonth() + 1);

  const { count, error } = await supabase
    .from('divisions')
    .select('id', { count: 'exact', head: true })
    .eq('criador_id', userId)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString());

  if (error) {
    return { allowed: false, used: 0, limit: 10 };
  }
  // Limite Free = 10. Pro ilimitado (valide plano na UI ou via Edge Function)
  return { allowed: (count ?? 0) < 10, used: count ?? 0, limit: 10 };
}

export async function createDivisionEqual(input: NewEqualDivisionInput) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Sessão inválida');

  // Validação backend (Edge Function). Se não vier payload, assume permitido.
  const { data: checkData, error: checkError } = await supabase.functions.invoke('enforcePlanLimits');
  if (checkError) {
    throw new Error(checkError.message || 'Falha na validação de plano. Tente novamente.');
  }
  const allowed = checkData?.allowed ?? true;
  if (!allowed) {
    const used = checkData?.used ?? 0;
    const limit = checkData?.limit ?? 10;
    throw new Error(`Limite mensal atingido (${used}/${limit}). Assine o Pro para divisões ilimitadas.`);
  }

  const { data, error } = await supabase
    .from('divisions')
    .insert({
      tipo: 'igual',
      local: input.local,
      data: input.data ?? null,
      total: input.total,
      taxa: input.taxa,
      gorjeta: input.gorjeta,
      criador_id: userId,
      status: 'ativa',
      comprovante_url: input.comprovante_url ?? null,
      comprovante_path: input.comprovante_path ?? null,
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createDivisionItems(input: NewItemsDivisionInput) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Sessão inválida');

  const { data: checkData, error: checkError } = await supabase.functions.invoke('enforcePlanLimits');
  if (checkError) {
    throw new Error(checkError.message || 'Falha na validação de plano. Tente novamente.');
  }
  const allowed = checkData?.allowed ?? true;
  if (!allowed) {
    const used = checkData?.used ?? 0;
    const limit = checkData?.limit ?? 10;
    throw new Error(`Limite mensal atingido (${used}/${limit}). Assine o Pro para divisões ilimitadas.`);
  }

  const { data, error } = await supabase
    .from('divisions')
    .insert({
      tipo: 'itens',
      local: input.local,
      data: input.data ?? null,
      total: input.total,
      taxa: input.taxa,
      gorjeta: input.gorjeta,
      criador_id: userId,
      status: 'ativa',
      comprovante_url: input.comprovante_url ?? null,
      comprovante_path: input.comprovante_path ?? null,
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function insertDivisionItems(divisionId: string, items: Omit<DivisionItem, 'id' | 'division_id'>[]) {
  if (!items.length) return [];
  const payload = items.map((it) => ({
    division_id: divisionId,
    nome: it.nome,
    preco: it.preco,
    quantidade: it.quantidade,
  }));
  const { data, error } = await supabase
    .from('division_items')
    .insert(payload)
    .select();
  if (error) throw error;
  return data as DivisionItem[];
}

export async function getDivisionItems(divisionId: string) {
  const { data, error } = await supabase
    .from('division_items')
    .select('*')
    .eq('division_id', divisionId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as DivisionItem[];
}

export async function insertDivisionItemConsumers(
  divisionItemId: string,
  consumers: Omit<DivisionItemConsumer, 'id' | 'division_item_id'>[]
) {
  if (!consumers.length) return [];
  const payload = consumers.map((c) => ({
    division_item_id: divisionItemId,
    participant_id: c.participant_id,
    quantidade: c.quantidade ?? 0,
  }));
  const { data, error } = await supabase
    .from('division_item_consumers')
    .insert(payload)
    .select();
  if (error) throw error;
  return data as DivisionItemConsumer[];
}

export async function getDivisionItemConsumersByItemIds(itemIds: string[]) {
  if (!itemIds.length) return [];
  const { data, error } = await supabase
    .from('division_item_consumers')
    .select('*')
    .in('division_item_id', itemIds);
  if (error) throw error;
  return data as DivisionItemConsumer[];
}

export type DivisionParticipant = {
  id?: string;
  division_id: string;
  nome: string;
  dependentes: number;
  user_id?: string | null;
};

export async function insertDivisionParticipants(divisionId: string, participants: Omit<DivisionParticipant, 'id' | 'division_id'>[]) {
  if (!participants.length) return [];
  const payload = participants.map((p) => ({
    division_id: divisionId,
    nome: p.nome,
    dependentes: p.dependentes ?? 0,
    user_id: p.user_id ?? null,
  }));
  const { data, error } = await supabase
    .from('division_participants')
    .insert(payload)
    .select();
  if (error) throw error;
  return data as DivisionParticipant[];
}

export async function getDivisionParticipants(divisionId: string) {
  const { data, error } = await supabase
    .from('division_participants')
    .select('*')
    .eq('division_id', divisionId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as DivisionParticipant[];
}

// ====== Novas funções para edição/atualização ======
export async function getDivisionById(id: string) {
  const { data, error } = await supabase
    .from('divisions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as any;
}

export async function updateDivisionBasic(
  id: string,
  fields: Partial<{ local: string; data: string | null; total: number; taxa: number; gorjeta: number; status: string; comprovante_url: string | null; comprovante_path: string | null }>
) {
  const { data, error } = await supabase
    .from('divisions')
    .update(fields)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as any;
}

export async function deleteDivisionParticipants(divisionId: string) {
  const { error } = await supabase
    .from('division_participants')
    .delete()
    .eq('division_id', divisionId);
  if (error) throw error;
}

// Edição transacional de participantes via RPC (apaga e reinsere atomicamente)
export async function applyDivisionParticipantsTransactional(
  divisionId: string,
  participants: Omit<DivisionParticipant, 'id' | 'division_id'>[]
) {
  const payload = participants.map((p) => ({ nome: p.nome, dependentes: p.dependentes ?? 0, user_id: p.user_id ?? null }));
  const { data, error } = await supabase.rpc('edit_division_participants', {
    division_uuid: divisionId,
    participants: payload as any,
  });
  if (error) throw error;
  return data as number; // quantidade inserida
}

export async function deleteDivisionItems(divisionId: string) {
  const { error } = await supabase
    .from('division_items')
    .delete()
    .eq('division_id', divisionId);
  if (error) throw error;
}

export async function deleteDivisionItemConsumersByItemIds(itemIds: string[]) {
  if (!itemIds.length) return;
  const { error } = await supabase
    .from('division_item_consumers')
    .delete()
    .in('division_item_id', itemIds);
  if (error) throw error;
}
