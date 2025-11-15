import { useEffect, useState, useCallback } from 'react';
import RNBilling from 'react-native-billing';
import { supabase } from '../lib/supabaseClient';

type UserPlan = { 
  plano: 'free' | 'pro';
  play_store_token: string | null;
  play_store_product_id: string | null;
};

export function useUserPlan() {
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const verifySubscription = async (token: string) => {
    try {
      const purchases = await RNBilling.loadOwnedPurchasesFromGoogle();
      const activeSub = purchases.find(p => 
        p.purchaseToken === token && 
        p.productId === 'divideai.pro.monthly' &&
        p.autoRenewing
      );
      return !!activeSub;
    } catch (err) {
      console.warn('Erro ao verificar assinatura:', err);
      return false;
    }
  };

  const refresh = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setPlan({ plano: 'free', play_store_token: null, play_store_product_id: null });
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('plano, play_store_token, play_store_product_id')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      setPlan({ plano: 'free', play_store_token: null, play_store_product_id: null });
      setLoading(false);
      return;
    }

    if (data.play_store_token) {
      const isActive = await verifySubscription(data.play_store_token);
      if (!isActive && data.plano === 'pro') {
        await supabase
          .from('users')
          .update({ 
            plano: 'free',
            play_store_token: null,
            play_store_product_id: null
          })
          .eq('id', userId);
        setPlan({ plano: 'free', play_store_token: null, play_store_product_id: null });
      } else {
        setPlan(data);
      }
    } else {
      setPlan(data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isPro = plan?.plano === 'pro';

  return { plan, isPro, loading, refresh };
}