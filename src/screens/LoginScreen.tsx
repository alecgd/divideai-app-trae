import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import Snackbar from '../components/Snackbar';
import { supabase } from '../lib/supabaseClient';

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  async function handleLogin() {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMsg(error.message || 'Erro ao entrar');
      } else {
        // sessão será aplicada automaticamente e App renderiza as abas
        setErrorMsg('');
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
        setErrorMsg(error.message || 'Erro no cadastro');
      } else if (data.user) {
        setMode('login');
        setErrorMsg('');
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
        style={{ borderWidth: 1, borderColor: errorMsg ? '#FF6B6B' : '#DDD', borderRadius: 8, padding: 12, marginBottom: 4 }}
      />
      {errorMsg ? (
        <Text style={{ color: '#FF6B6B', marginBottom: 8 }}>{errorMsg}</Text>
      ) : null}
      <TextInput
        placeholder="Senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, borderColor: errorMsg ? '#FF6B6B' : '#DDD', borderRadius: 8, padding: 12, marginBottom: 16 }}
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
      <Snackbar visible={!!errorMsg} message={errorMsg} onDismiss={() => setErrorMsg('')} />
    </View>
  );
}
