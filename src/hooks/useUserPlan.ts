import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

type UserPlan = { plano: 'free' | 'pro'; plano_expira_em: string | null };

export function useUserPlan() {
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchPlan() {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) {
        if (mounted) {
          setPlan(null);
          setLoading(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from('users')
        .select('plano, plano_expira_em')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        if (mounted) {
          setPlan({ plano: 'free', plano_expira_em: null });
        }
      } else {
        if (mounted) {
          setPlan(
            data ?? {
              plano: 'free',
              plano_expira_em: null,
            }
          );
        }
      }
      if (mounted) setLoading(false);
    }
    fetchPlan();
    return () => {
      mounted = false;
    };
  }, []);

  const isPro =
    plan?.plano === 'pro' &&
    (!plan.plano_expira_em || new Date(plan.plano_expira_em).getTime() > Date.now());

  // expõe um método para forçar refetch (memorizado para identidade estável)
  const refresh = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setPlan(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('plano, plano_expira_em')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      setPlan({ plano: 'free', plano_expira_em: null });
    } else {
      setPlan(
        data ?? {
          plano: 'free',
          plano_expira_em: null,
        }
      );
    }
    setLoading(false);
  }, []);

  return { plan, isPro, loading, refresh };
}