import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppTabs from './AppTabs';
import NewDivisionEqualScreen from '../screens/NewDivisionEqualScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={AppTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="NovaDivisaoIgual"
        component={NewDivisionEqualScreen}
        options={{ title: 'Nova Divisão – Igualitária' }}
      />
    </Stack.Navigator>
  );
}