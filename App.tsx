import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabaseClient';
import LoginScreen from './src/screens/LoginScreen';
import RootNavigator from './src/navigation/RootNavigator';
import { Linking } from 'react-native';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
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
        PlanoPro: 'pro/:status'
      }
    }
  };

  return (
    <NavigationContainer linking={linking}>
      {session ? <RootNavigator /> : <LoginScreen />}
    </NavigationContainer>
  );
}