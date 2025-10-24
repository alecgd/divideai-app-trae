import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { supabase } from '../lib/supabaseClient';

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        Alert.alert('Erro ao entrar', error.message);
      } else {
        // sessão será aplicada automaticamente e App renderiza as abas
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup() {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        Alert.alert('Erro no cadastro', error.message);
      } else if (data.user) {
        Alert.alert('Cadastro criado', 'Verifique seu e-mail (se necessário) e faça login.');
        setMode('login');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '600', color: '#2F2F2F', marginBottom: 12 }}>
        {mode === 'login' ? 'Entrar' : 'Cadastrar'}
      </Text>

      <TextInput
        placeholder="E-mail"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginBottom: 12 }}
      />
      <TextInput
        placeholder="Senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginBottom: 16 }}
      />

      {mode === 'login' ? (
        <Button title={loading ? 'Entrando...' : 'Entrar'} onPress={handleLogin} color="#FF6B6B" />
      ) : (
        <Button title={loading ? 'Cadastrando...' : 'Cadastrar'} onPress={handleSignup} color="#FF6B6B" />
      )}

      <View style={{ marginTop: 16 }}>
        {mode === 'login' ? (
          <Text style={{ color: '#2F2F2F' }}>
            Não tem conta?{' '}
            <Text style={{ color: '#45B7D1' }} onPress={() => setMode('signup')}>
              Cadastrar
            </Text>
          </Text>
        ) : (
          <Text style={{ color: '#2F2F2F' }}>
            Já tem conta?{' '}
            <Text style={{ color: '#45B7D1' }} onPress={() => setMode('login')}>
              Entrar
            </Text>
          </Text>
        )}
      </View>
    </View>
  );
}