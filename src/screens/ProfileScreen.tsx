import React from 'react';
import { View, Text, Button } from 'react-native';
import { theme } from '../theme';
import { supabase } from '../lib/supabaseClient';

export default function ProfileScreen() {
  async function handleLogout() {
    await supabase.auth.signOut();
  }
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '500', color: theme.colors.textOnLight, fontFamily: theme.typography.h2.fontFamily }}>
        Perfil
      </Text>
      <Text style={{ marginTop: 8, color: theme.colors.textOnLight, fontFamily: theme.typography.body.fontFamily }}>
        Ajuste idioma, modo escuro e notificações.
      </Text>
      <View style={{ marginTop: 24 }}>
        <Button title="Sair" onPress={handleLogout} color={theme.colors.primary} />
      </View>
    </View>
  );
}
