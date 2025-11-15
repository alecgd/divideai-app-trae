import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { theme } from '../theme';
import BrandHeader from '../components/BrandHeader';

export default function OnboardingScreen({ navigation }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.white }}>
      <View style={{ paddingTop: 24 }}>
        <BrandHeader mode="dark" backgroundColor={theme.colors.white} />
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        {/* Hero illustration placeholder */}
        <Image
          source={{ uri: 'https://via.placeholder.com/360x360.png?text=DivideAI' }}
          style={{ width: 320, height: 320, borderRadius: 16 }}
          resizeMode="contain"
        />

        <Text style={{ fontSize: 28, fontWeight: '700', color: theme.colors.textOnLight, textAlign: 'center', marginTop: 24, fontFamily: theme.typography.h1.fontFamily }}>
          Divida suas contas de forma rápida e justa!
        </Text>

        {/* Pager dots (estáticos) */}
        <View style={{ flexDirection: 'row', marginTop: 16 }}>
          {[0,1,2,3].map((i) => (
            <View key={i} style={{ width: 8, height: 8, borderRadius: 8, marginHorizontal: 6, backgroundColor: i === 0 ? theme.colors.primary : theme.colors.muted }} />
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={{ marginTop: 24, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 28, backgroundColor: theme.colors.primary, width: '100%' }}
        >
          <Text style={{ color: theme.colors.white, fontSize: 18, fontWeight: '600', textAlign: 'center', fontFamily: theme.typography.h2.fontFamily }}>Começar a dividir</Text>
        </TouchableOpacity>

        {/* Link secundário */}
        <Text style={{ marginTop: 16, color: theme.colors.textOnLight }}>
          Já possui conta? <Text style={{ color: theme.colors.primary }} onPress={() => navigation.navigate('Login')}>Acessar</Text>
        </Text>
      </View>
    </View>
  );
}
