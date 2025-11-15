import React, { useEffect } from 'react';
import { View, Text, Button, Linking } from 'react-native';
import BrandHeader from '../components/BrandHeader';
import { theme } from '../theme';
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
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <BrandHeader />
      <View style={{ padding: theme.spacing.lg }}>
        <Text style={{ ...theme.typography.h1, color: theme.colors.textPrimary }}>
          Olá! 👋
        </Text>
        <Text style={{ marginTop: theme.spacing.sm, color: theme.colors.textSecondary }}>
          Vamos dividir uma conta hoje?
        </Text>

      {!loading && !isPro && (
        <View style={{ marginTop: theme.spacing.lg, backgroundColor: '#2A1B1B', padding: theme.spacing.md, borderRadius: theme.radii.md }}>
          <Text style={{ color: theme.colors.textPrimary }}>Conheça a versão Pro</Text>
          <Button
            title="Saiba Mais"
            onPress={() => nav.getParent()?.navigate('PlanoPro')}
            color={theme.colors.primary}
          />
        </View>
      )}

      <View style={{ marginTop: theme.spacing.lg }}>
        <Button
          title="Nova Divisão"
          onPress={() => nav.navigate('NovaDivisaoIgual')}
          color={theme.colors.primary}
        />
      </View>

      <View style={{ marginTop: theme.spacing.md }}>
        <Button
          title="Nova Divisão por Itens"
          onPress={() => nav.navigate('NovaDivisaoItens')}
          color={theme.colors.secondary}
        />
      </View>
      </View>
    </View>
  );
}
