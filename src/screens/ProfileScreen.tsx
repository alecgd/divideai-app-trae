import React from 'react';
import { View, Text, Button } from 'react-native';
import { supabase } from '../lib/supabaseClient';

export default function ProfileScreen() {
  async function handleLogout() {
    await supabase.auth.signOut();
  }
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '500', color: '#2F2F2F' }}>
        Perfil
      </Text>
      <Text style={{ marginTop: 8, color: '#2F2F2F' }}>
        Ajuste idioma, modo escuro e notificações.
      </Text>
      <View style={{ marginTop: 24 }}>
        <Button title="Sair" onPress={handleLogout} color="#FF6B6B" />
      </View>
    </View>
  );
}