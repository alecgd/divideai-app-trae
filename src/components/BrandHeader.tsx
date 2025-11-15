import React from 'react';
import { View, Text, Platform } from 'react-native';
import { theme } from '../theme';

type BrandHeaderProps = {
  mode?: 'light' | 'dark';
  backgroundColor?: string;
};

export default function BrandHeader({ mode, backgroundColor }: BrandHeaderProps) {
  const containerBg = backgroundColor ?? theme.colors.background;
  // Para web, evita importar PNGs que estão causando erro no bundler
  const isWeb = Platform.OS === 'web';

  return (
    <View
      style={{
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        backgroundColor: containerBg,
        borderBottomColor: theme.colors.divider,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text
          style={{
            color: theme.colors.text,
            fontFamily: theme.typography.h1.fontFamily,
            fontSize: 20,
          }}
        >
          DivideAI
        </Text>
      </View>
      {/* Placeholder para ações futuras: perfil, tema, etc. */}
      <View />
    </View>
  );
}
