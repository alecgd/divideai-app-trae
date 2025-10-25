import React, { useState } from 'react';
import { View, Text, Button, Alert, ActivityIndicator, Linking } from 'react-native';
import { supabase } from '../lib/supabaseClient';

export default function ProPlanScreen() {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        Alert.alert('Faça login', 'Você precisa estar logado para assinar o Pro.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('createCheckoutSession', {
        body: { mode: 'subscription' },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (error) {
        Alert.alert('Erro ao iniciar checkout', (error as any)?.message ?? 'Verifique segredos e logs.');
        return;
      }

      const rawUrl =
        (data as any)?.url ??
        (data as any)?.session?.url ??
        (data as any)?.session_url;

      const sid =
        (data as any)?.sessionId ??
        (data as any)?.session?.id ??
        (data as any)?.id;

      const cleanUrl =
        typeof rawUrl === 'string'
          ? rawUrl.trim().replace(/^[\s`'"]+|[\s`'"]+$/g, '')
          : undefined;

      if (!cleanUrl) {
        Alert.alert(
          'Sessão sem URL',
          `Session ID: ${sid ?? 'n/a'}.\nCheque os logs do Stripe com esse ID.`
        );
        return;
      }

      await Linking.openURL(cleanUrl);
    } catch (e: any) {
      Alert.alert('Erro inesperado', e.message ?? 'Falha ao abrir checkout');
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

      <View style={{ marginTop: 24 }}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Button title="Assinar Pro" onPress={handleCheckout} color="#FF6B6B" />
        )}
      </View>

      <Text style={{ marginTop: 16, color: '#666' }}>
        O pagamento é processado via Stripe (ambiente de testes).
      </Text>
    </View>
  );
}