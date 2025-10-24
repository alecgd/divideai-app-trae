import React from 'react';
import { View, Text } from 'react-native';

export default function FriendsScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '500', color: '#2F2F2F' }}>
        Meus Amigos
      </Text>
      <Text style={{ marginTop: 8, color: '#2F2F2F' }}>
        Gerencie seus contatos para divisões.
      </Text>
    </View>
  );
}