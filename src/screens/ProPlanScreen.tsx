import React, { useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { supabase } from '../lib/supabaseClient';

export default function ProPlanScreen() {
  const [loading, setLoading] = useState(false);
  // Billing será implementado depois

  async function handleCheckout() {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        Alert.alert('Faça login', 'Você precisa estar logado para assinar o Pro.');
        return;
      }

      // Inicia a compra
      const purchase = await RNBilling.purchase(SUBSCRIPTION_ID);
      
      // Confirma a compra com o Google
      await RNBilling.acknowledgePurchase(purchase.purchaseToken);
      
      // Atualiza o plano no Supabase
      const { error } = await supabase
        .from('users')
        .update({ 
          plano: 'pro',
          play_store_token: purchase.purchaseToken,
          play_store_product_id: SUBSCRIPTION_ID
        })
        .eq('id', sessionData.session.user.id);

      if (error) {
        console.error('Erro ao atualizar plano:', error);
        Alert.alert(
          'Erro ao ativar plano',
          'A compra foi realizada mas houve um erro ao ativar o plano. Entre em contato com o suporte.'
        );
        return;
      }

      Alert.alert(
        'Sucesso!', 
        'Assinatura Pro ativada com sucesso! Aproveite todos os recursos.'
      );
    } catch (err: any) {
      console.error('Erro na compra:', err);
      if (err.code === 1) {
        // Usuário cancelou
        return;
      }
      Alert.alert(
        'Erro na assinatura', 
        'Não foi possível completar a compra. Tente novamente mais tarde.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', color: '#2F2F2F' }}>
        Plano Pro
      </Text>
      <Text style={{ marginTop: 8, color: '#2F2F2F' }}>
        • Divisões ilimitadas e recursos avançados
      </Text>
      <Text style={{ marginTop: 4, color: '#2F2F2F' }}>
        • Suporte prioritário e mais conveniências
      </Text>

      {products.length > 0 && (
        <Text style={{ marginTop: 12, fontSize: 18, color: '#2F2F2F' }}>
          {products[0].localizedPrice}/mês
        </Text>
      )}

      <View style={{ marginTop: 24 }}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Button 
            title={products.length > 0 ? `Assinar Pro - ${products[0].localizedPrice}/mês` : 'Assinar Pro'}
            onPress={handleCheckout} 
            color="#FF6B6B" 
          />
        )}
      </View>

      <Text style={{ marginTop: 16, color: '#666' }}>
        Assinatura renovada automaticamente através da Google Play Store.
        Cancele a qualquer momento pela Play Store.
      </Text>
    </View>
  );
}