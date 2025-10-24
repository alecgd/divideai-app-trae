// deno
import 'https://deno.land/std@0.224.0/dotenv/load.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LIMIT_FREE = 10;

Deno.serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Usuário autenticado via JWT
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const userId = userData.user.id;

    // Plano do usuário (com RLS)
    const { data: planRow } = await supabase
      .from('users')
      .select('plano, plano_expira_em')
      .eq('id', userId)
      .maybeSingle();

    const plano = (planRow?.plano ?? 'free') as 'free' | 'pro';
    const exp = planRow?.plano_expira_em ? new Date(planRow.plano_expira_em) : null;
    const isPro = plano === 'pro' && (!exp || exp.getTime() > Date.now());

    if (isPro) {
      return new Response(JSON.stringify({ allowed: true, used: 0, limit: 'unlimited' }), { status: 200 });
    }

    // Contagem de divisões do mês atual
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);

    const { count, error: countError } = await supabase
      .from('divisions')
      .select('id', { count: 'exact', head: true })
      .eq('criador_id', userId)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString());

    if (countError) {
      return new Response(JSON.stringify({ error: 'Count failed' }), { status: 500 });
    }

    const used = count ?? 0;
    const allowed = used < LIMIT_FREE;
    return new Response(JSON.stringify({ allowed, used, limit: LIMIT_FREE }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error', detail: String(e) }), { status: 500 });
  }
});