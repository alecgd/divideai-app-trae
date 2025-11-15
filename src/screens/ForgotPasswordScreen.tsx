import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabaseClient';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  async function handleRecover() {
    setStatus('idle');
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'divideai://reset-password',
      });
      if (error) {
        setStatus('error');
        setErrorMsg(error.message || 'Erro ao iniciar recuperação');
      } else {
        setStatus('sent');
      }
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e?.message || 'Erro inesperado');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F6F7F9' }}>
      <View style={{ padding: 24, backgroundColor: '#F6F7F9' }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#2F2F2F' }}>Tudo bem, vamos resolver isso!</Text>
        <Text style={{ marginTop: 8, color: '#444' }}>
          Digite seu e-mail de cadastro aqui no DivideAI e vamos enviar um link para você criar uma nova senha.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 24 }}>
        <TextInput
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14 }}
        />
        {status === 'error' ? (
          <Text style={{ color: '#E53935', marginTop: 6 }}>{errorMsg}</Text>
        ) : null}

        <TouchableOpacity
          onPress={handleRecover}
          style={{ marginTop: 24, backgroundColor: '#FF6B6B', paddingVertical: 16, borderRadius: 28 }}
        >
          <Text style={{ color: '#FFF', textAlign: 'center', fontSize: 18, fontWeight: '600' }}>Recuperar senha</Text>
        </TouchableOpacity>

        {status === 'sent' ? (
          <Text style={{ color: '#2F2F2F', marginTop: 12 }}>
            Se encontrarmos sua conta, enviaremos um e-mail com instruções.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

