import React from 'react';
import { View, Text, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useUserPlan } from '../hooks/useUserPlan';

export default function HomeScreen() {
  const nav = useNavigation<any>();
  const { isPro, loading } = useUserPlan();

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
          <Button title="Saiba Mais" onPress={() => { /* navegar para Plano Pro */ }} color="#FF6B6B" />
        </View>
      )}

      <View style={{ marginTop: 16 }}>
        <Button
          title="Nova Divisão"
          onPress={() => nav.navigate('NovaDivisaoIgual')}
          color="#FF6B6B"
        />
      </View>
    </View>
  );
}