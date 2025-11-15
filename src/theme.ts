import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';
const fonts = {
  regular: isWeb ? undefined : 'Inter_400Regular',
  medium: isWeb ? undefined : 'Inter_500Medium',
  bold: isWeb ? undefined : 'Inter_700Bold',
};

export const theme = {
  colors: {
    // Base (dark UI)
    background: '#202325', // ink.darker
    surface: '#303437', // ink.dark
    textPrimary: '#FFFFFF', // sky.white para textos sobre fundo escuro
    textSecondary: '#6c7072', // ink.light
    // Brand
    primary: '#ff8877', // primary.base
    secondary: '#48a7f8', // blue.base
    // Estados
    success: '#23c16b',
    warning: '#ffb323',
    error: '#ff5247',
    // Neutros
    divider: '#e3e5e5', // sky.light
    white: '#FFFFFF', // sky.white
    textOnLight: '#090a0a', // ink.darkest
    muted: '#cdcfd0', // sky.base
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  radii: {
    sm: 6,
    md: 12,
    lg: 16,
  },
  typography: {
    // Alinhado aos tokens (Inter)
    h1: { fontSize: 24, lineHeight: 32, fontFamily: fonts.bold }, // title3
    h2: { fontSize: 18, lineHeight: 24, fontFamily: fonts.medium },
    body: { fontSize: 16, lineHeight: 24, fontFamily: fonts.regular },
    caption: { fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
    title2: { fontSize: 32, lineHeight: 36, fontFamily: fonts.bold },
  },
};

export type Theme = typeof theme;
