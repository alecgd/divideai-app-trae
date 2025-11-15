import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { theme } from '../theme';
import { supabase } from '../lib/supabaseClient';
import { useNavigation } from '@react-navigation/native';
import BrandHeader from '../components/BrandHeader';

export default function ResetPasswordScreen() {
  const navigation = useNavigation<any>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [success, setSuccess] = useState(false);

  async function handleChangePassword() {
    setErrorMsg('');
    if (!password || password.length < 6) {
      setErrorMsg('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMsg(error.message || 'Não foi possível alterar a senha');
      return;
    }
    setSuccess(true);
    setTimeout(() => navigation.navigate('Login'), 1200);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.white }}>
      <View style={{ paddingTop: 24 }}>
        <BrandHeader mode="dark" backgroundColor={theme.colors.white} />
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: theme.colors.textOnLight, fontFamily: theme.typography.h1.fontFamily }}>Redefinir senha</Text>
        <Text style={{ marginTop: 8, color: theme.colors.textSecondary, fontFamily: theme.typography.body.fontFamily }}>
          Digite sua nova senha duas vezes para confirmar.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
        <Text style={{ color: theme.colors.textSecondary, marginBottom: 6, fontFamily: theme.typography.body.fontFamily }}>Nova senha</Text>
        <TextInput
          placeholder="Sua nova senha"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{ backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.divider, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, marginBottom: 12 }}
        />
        <Text style={{ color: theme.colors.textSecondary, marginBottom: 6, fontFamily: theme.typography.body.fontFamily }}>Repita a nova senha</Text>
        <TextInput
          placeholder="Confirme a nova senha"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          style={{ backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.divider, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14 }}
        />
        {errorMsg ? <Text style={{ color: theme.colors.error, marginTop: 8 }}>{errorMsg}</Text> : null}
        {success ? <Text style={{ color: theme.colors.textOnLight, marginTop: 8 }}>Senha alterada com sucesso!</Text> : null}

        <TouchableOpacity onPress={handleChangePassword} style={{ marginTop: 24, backgroundColor: theme.colors.primary, borderRadius: 28, height: 52, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.white, fontSize: 18, fontWeight: '600', fontFamily: theme.typography.h2.fontFamily }}>Alterar minha senha</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
