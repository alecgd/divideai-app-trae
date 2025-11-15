import React, { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { NavigationContainer } from '@react-navigation/native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabaseClient';
import LoginScreen from './src/screens/LoginScreen';
import AuthNavigator from './src/navigation/AuthNavigator';
import RootNavigator from './src/navigation/RootNavigator';
import { Linking, Platform } from 'react-native';
import RNBilling from 'react-native-billing';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [fontsLoaded] = useFonts({
    Inter_400Regular: require('./src/assets/fonts/Inter-Regular.ttf'),
    Inter_500Medium: require('./src/assets/fonts/Inter-Medium.ttf'),
    Inter_700Bold: require('./src/assets/fonts/Inter-Bold.ttf'),
  });

  useEffect(() => {
    // Inicializa autenticação
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  const linking = {
    prefixes: ['divideai://'],
    config: {
      screens: {
        PlanoPro: 'pro/:status',
        ResetPassword: 'reset-password',
        Terms: 'terms',
        Privacy: 'privacy'
      }
    }
  };

  // No web, não bloqueia a renderização caso as fontes falhem
  if (!fontsLoaded && Platform.OS !== 'web') {
    return null;
  }

  return (
    <NavigationContainer linking={linking}>
      {session ? <RootNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
