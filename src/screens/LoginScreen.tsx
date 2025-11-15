import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { theme } from '../theme';
import Snackbar from '../components/Snackbar';
import { supabase } from '../lib/supabaseClient';
import { useNavigation } from '@react-navigation/native';
import BrandHeader from '../components/BrandHeader';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  async function handleGoogle() {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'divideai://auth-callback' }
      });
    } catch (e: any) {
      setErrorMsg(e?.message || 'Erro ao acessar com Google');
    }
  }

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
    <View style={{ flex: 1, backgroundColor: theme.colors.white }}>
      <View style={{ paddingTop: 24 }}>
        <BrandHeader mode="dark" backgroundColor={theme.colors.white} />
      </View>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: theme.colors.textOnLight, marginBottom: 16, textAlign: 'left', fontFamily: theme.typography.h1.fontFamily }}>
          {mode === 'login' ? 'Acesse sua conta' : 'Criar conta'}
        </Text>

      <Text style={{ color: theme.colors.textSecondary, marginBottom: 6, fontFamily: theme.typography.body.fontFamily }}>E-mail</Text>
      <TextInput
        placeholder="email@exemplo.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: errorMsg ? theme.colors.error : theme.colors.divider, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, marginBottom: 12, backgroundColor: theme.colors.white }}
      />
      {errorMsg ? (
        <Text style={{ color: theme.colors.error, marginTop: 8 }}>{errorMsg}</Text>
      ) : null}
      <Text style={{ color: theme.colors.textSecondary, marginTop: 12, marginBottom: 6, fontFamily: theme.typography.body.fontFamily }}>Senha</Text>
      <TextInput
        placeholder="Sua senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, borderColor: errorMsg ? theme.colors.error : theme.colors.divider, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, backgroundColor: theme.colors.white }}
      />

      <TouchableOpacity
        onPress={mode === 'login' ? handleLogin : handleSignup}
        style={{ marginTop: 20, backgroundColor: theme.colors.primary, borderRadius: 28, height: 52, alignItems: 'center', justifyContent: 'center' }}
        disabled={loading}
      >
        <Text style={{ color: theme.colors.white, fontSize: 18, fontWeight: '600', fontFamily: theme.typography.h2.fontFamily }}>
          {mode === 'login' ? (loading ? 'Entrando...' : 'Acessar') : (loading ? 'Cadastrando...' : 'Criar conta')}
        </Text>
      </TouchableOpacity>

      <View style={{ marginTop: 16, alignItems: 'center' }}>
        {mode === 'login' ? (
          <Text style={{ color: theme.colors.textOnLight }}>
            Não tem conta?{' '}
            <Text style={{ color: theme.colors.secondary }} onPress={() => setMode('signup')}>
              Cadastrar
            </Text>
          </Text>
        ) : (
          <Text style={{ color: theme.colors.textOnLight }}>
            Já tem conta?{' '}
            <Text style={{ color: theme.colors.secondary }} onPress={() => setMode('login')}>
              Entrar
            </Text>
          </Text>
        )}
        {mode === 'login' ? (
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={{ marginTop: 8 }}>
            <Text style={{ color: theme.colors.primary }}>Esqueci minha senha</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Divider de OAuth */}
      <View style={{ marginTop: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.divider }} />
          <Text style={{ marginHorizontal: 12, color: theme.colors.textSecondary }}>Ou acesse com</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.divider }} />
        </View>
        <TouchableOpacity
          onPress={handleGoogle}
          style={{ marginTop: 12, borderWidth: 1, borderColor: theme.colors.divider, borderRadius: 28, height: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.white }}
        >
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.white, marginRight: 12, borderWidth: 1, borderColor: theme.colors.divider }} />
          <Text style={{ color: theme.colors.textOnLight, fontSize: 16, fontFamily: theme.typography.h2.fontFamily }}>Conta do Google</Text>
        </TouchableOpacity>
      </View>

      {/* Termos e privacidade */}
      <View style={{ marginTop: 24 }}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, textAlign: 'center', fontFamily: theme.typography.caption.fontFamily }}>
          Ao continuar, você concorda com nossos{' '}
          <Text style={{ color: theme.colors.primary }} onPress={() => navigation.navigate('Terms')}>Termos de Serviço</Text>
          {' '}e{' '}
          <Text style={{ color: theme.colors.primary }} onPress={() => navigation.navigate('Privacy')}>Política de Privacidade</Text>.
        </Text>
      </View>
      <Snackbar visible={!!errorMsg} message={errorMsg} onDismiss={() => setErrorMsg('')} />
      </View>
    </View>
  );
}
