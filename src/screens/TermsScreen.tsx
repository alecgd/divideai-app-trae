import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { theme } from '../theme';
import BrandHeader from '../components/BrandHeader';

export default function TermsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.white }}>
      <View style={{ paddingTop: 24 }}>
        <BrandHeader mode="dark" backgroundColor={theme.colors.white} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: '600', color: theme.colors.textOnLight, textAlign: 'center', marginBottom: 16, fontFamily: theme.typography.h2.fontFamily }}>Termos de serviço</Text>
        <Text style={{ color: theme.colors.textOnLight, lineHeight: 22, fontFamily: theme.typography.body.fontFamily }}>
          Lorem ipsum dolor sit amet consectetur. Sed aliquam faucibus mus nibh sed faucibus facilisis urna. Id velit tortor sodales urna enim lacinia placerat risus. Massa pharetra volutpat elementum sit dolor molestie libero odio mauris. Et eget venenatis pretium urna sit...
        </Text>
        <Text style={{ color: theme.colors.textOnLight, lineHeight: 22, marginTop: 16, fontFamily: theme.typography.body.fontFamily }}>
          Porttitor in pellentesque venenatis mi sed pharetra ornare arcu. Ipsum integer sed velit pharetra ultricies sed scelerisque at sem...
        </Text>
      </ScrollView>
    </View>
  );
}
