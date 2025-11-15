import React, { useEffect } from 'react';
import { View, Text, Button, Linking } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useUserPlan } from '../hooks/useUserPlan';

export default function HomeScreen() {
  const nav = useNavigation<any>();
  const { isPro, loading, refresh } = useUserPlan();

  // Atualiza plano ao focar na tela (retorno do Checkout)
  useFocusEffect(
    React.useCallback(() => {
      refresh();
      // sem dependências, para não disparar em loop
    }, [])
  );

  // Opcional: também atualiza ao receber deep link divideai://pro/...
  useEffect(() => {
    const sub = Linking.addEventListener('url', () => {
      refresh();
    });
    return () => {
      sub.remove();
    };
  }, [refresh]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: '600', color: '#2F2F2F' }}>
        Olá! 👋
      </Text>
      <Text style={{ marginTop: 8, color: '#2F2F2F' }}>
        Vamos dividir uma conta hoje?
      </Text>

      {!loading && !isPro && (
        <View style={{ marginTop: 16, backgroundColor: '#FFF1EF', padding: 12, borderRadius: 8 }}>
          <Text style={{ color: '#2F2F2F' }}>Conheça a versão Pro</Text>
          <Button
            title="Saiba Mais"
            onPress={() => nav.getParent()?.navigate('PlanoPro')}
            color="#FF6B6B"
          />
        </View>
      )}

      <View style={{ marginTop: 16 }}>
        <Button
          title="Nova Divisão"
          onPress={() => nav.navigate('NovaDivisaoIgual')}
          color="#FF6B6B"
        />
      </View>

      <View style={{ marginTop: 12 }}>
        <Button
          title="Nova Divisão por Itens"
          onPress={() => nav.navigate('NovaDivisaoItens')}
          color="#45B7D1"
        />
      </View>
    </View>
  );
}