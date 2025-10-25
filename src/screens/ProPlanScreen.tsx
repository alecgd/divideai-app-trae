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

      try {
        const { data: urlCheck, error: urlError } = await supabase.functions.invoke('checkUrls', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        
        console.log('URL Check Response:', { data: urlCheck, error: urlError });
        
        if (urlError) {
          Alert.alert(
            'Erro no Check',
            'Erro: ' + JSON.stringify(urlError, null, 2),
            [{ text: 'OK', onPress: () => setLoading(false) }],
            { cancelable: false }
          );
          return;
        }
        
        // Primeiro Alert com os dados
        await new Promise((resolve) => {
          Alert.alert(
            'Valores dos Secrets',
            JSON.stringify(urlCheck, null, 2),
            [{ text: 'OK', onPress: resolve }],
            { cancelable: false }
          );
        });
      } catch (e) {
        Alert.alert('Erro inesperado', 
          'Erro: ' + JSON.stringify(e, null, 2)
        );
        setLoading(false);
        return;
      }

      console.log('Iniciando checkout...');
      const { data, error } = await supabase.functions.invoke('createCheckoutSession', {
        body: { mode: 'subscription' },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      console.log('Resposta do checkout:', { data, error });
      
      if (error) {
        Alert.alert(
          'Erro ao iniciar checkout',
          `Erro: ${JSON.stringify(error, null, 2)}\n\nDados: ${JSON.stringify(data, null, 2)}`
        );
        return;
      }

      // Parse a resposta se vier como string
      const responseData = typeof data === 'string' ? JSON.parse(data) : data;
      console.log('Dados parseados:', responseData);

      const rawUrl = responseData?.url ?? responseData?.session?.url;
      console.log('URL bruta:', rawUrl);

      // Limpa TODAS as crases e espaços da URL
      const cleanUrl = typeof rawUrl === 'string'
        ? rawUrl.replace(/[`\s]/g, '')
        : undefined;
      
      console.log('URL após limpeza:', cleanUrl);

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