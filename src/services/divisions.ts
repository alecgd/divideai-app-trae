import { supabase } from '../lib/supabaseClient';

export type NewEqualDivisionInput = {
  tipo: 'igual';
  local: string;
  data?: string; // ISO date yyyy-mm-dd
  total: number;
  taxa: number;
  gorjeta: number;
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
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}