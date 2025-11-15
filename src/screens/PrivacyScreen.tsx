import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { theme } from '../theme';
import BrandHeader from '../components/BrandHeader';

export default function PrivacyScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.white }}>
      <View style={{ paddingTop: 24 }}>
        <BrandHeader mode="dark" backgroundColor={theme.colors.white} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: '600', color: theme.colors.textOnLight, textAlign: 'center', marginBottom: 16, fontFamily: theme.typography.h2.fontFamily }}>Política de Privacidade</Text>
        <Text style={{ color: theme.colors.textOnLight, lineHeight: 22, fontFamily: theme.typography.body.fontFamily }}>
          Esta política descreve como coletamos, usamos e protegemos seus dados. Conteúdo placeholder para integração de cópia oficial.
        </Text>
      </ScrollView>
    </View>
  );
}
