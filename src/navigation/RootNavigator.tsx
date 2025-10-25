import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppTabs from './AppTabs';
import NewDivisionEqualScreen from '../screens/NewDivisionEqualScreen';
import DivisionDetailScreen from '../screens/DivisionDetailScreen';

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
      <Stack.Screen
        name="DetalheDivisao"
        component={DivisionDetailScreen}
        options={{ title: 'Detalhe da Divisão' }}
      />
      <Stack.Screen
        name="PlanoPro"
        component={require('../screens/ProPlanScreen').default}
        options={{ title: 'Plano Pro' }}
      />
    </Stack.Navigator>
  );
}