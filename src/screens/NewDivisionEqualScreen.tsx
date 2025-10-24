import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Switch, Button, Alert } from 'react-native';
import { useUserPlan } from '../hooks/useUserPlan';
import { useNavigation } from '@react-navigation/native';

export default function NewDivisionEqualScreen() {
  const { isPro } = useUserPlan();
  const [local, setLocal] = useState('');
  const [data, setData] = useState('');
  const [total, setTotal] = useState<string>('');
  const [taxa10, setTaxa10] = useState<boolean>(false);
  const [gorjetaOn, setGorjetaOn] = useState<boolean>(false);
  const [gorjeta, setGorjeta] = useState<string>('');
  const [qtdParticipantes, setQtdParticipantes] = useState<string>('2');
  const [dependentesPorPessoa, setDependentesPorPessoa] = useState<string>('0');

  const totalBase = useMemo(() => {
    const t = parseFloat(total || '0');
    const g = gorjetaOn ? parseFloat(gorjeta || '0') : 0;
    const taxa = taxa10 ? t * 0.1 : 0;
    return t + taxa + g;
  }, [total, gorjetaOn, gorjeta, taxa10]);

  const resultado = useMemo(() => {
    const participantes = parseInt(qtdParticipantes || '0', 10);
    const deps = isPro ? parseInt(dependentesPorPessoa || '0', 10) : 0;
    const pesoPorPessoa = 1 + deps; // dependentes somam no responsável
    const somaPesos = participantes * pesoPorPessoa;

    if (participantes <= 0 || totalBase <= 0 || somaPesos <= 0) return [];
    const valorPorPeso = totalBase / somaPesos;
    return Array.from({ length: participantes }).map((_p, idx) => ({
      pessoa: `Pessoa ${idx + 1}`,
      dependentes: deps,
      valor: +(valorPorPeso * pesoPorPessoa).toFixed(2),
    }));
  }, [qtdParticipantes, dependentesPorPessoa, totalBase, isPro]);

  const camposValidos =
    local.trim().length > 0 &&
    parseFloat(total || '0') > 0 &&
    parseInt(qtdParticipantes || '0', 10) > 0 &&
    (!gorjetaOn || parseFloat(gorjeta || '0') >= 0);

  const nav = useNavigation<any>();
  async function handleCriarDivisao() {
    if (!camposValidos) {
      Alert.alert('Campos obrigatórios', 'Preencha local, total e participantes.');
      return;
    }
    try {
      const t = parseFloat(total || '0');
      const taxa = taxa10 ? t * 0.1 : 0;
      const g = gorjetaOn ? parseFloat(gorjeta || '0') : 0;
      const { createDivisionEqual } = await import('../services/divisions');
      const created = await createDivisionEqual({
        tipo: 'igual',
        local,
        data: data || undefined,
        total: t,
        taxa,
        gorjeta: g,
      });
      Alert.alert('Divisão criada com sucesso!', `ID: ${created?.id}`);
      // Navega para a aba Histórico dentro do Tabs (navigator aninhado)
      nav.navigate('Tabs', { screen: 'Histórico' });
    } catch (e: any) {
      Alert.alert('Erro ao criar divisão', e.message ?? 'Tente novamente');
    }
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', color: '#2F2F2F' }}>Nova Divisão – Igualitária</Text>

      <TextInput
        placeholder="Local (ex.: Restaurante)"
        value={local}
        onChangeText={setLocal}
        style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginTop: 12 }}
      />
      <TextInput
        placeholder="Data (ex.: 2025-10-24)"
        value={data}
        onChangeText={setData}
        style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginTop: 12 }}
      />
      <TextInput
        placeholder="Total (R$)"
        keyboardType="decimal-pad"
        value={total}
        onChangeText={setTotal}
        style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginTop: 12 }}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
        <Switch value={taxa10} onValueChange={setTaxa10} />
        <Text style={{ marginLeft: 8, color: '#2F2F2F' }}>Taxa de serviço 10%</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
        <Switch value={gorjetaOn} onValueChange={setGorjetaOn} />
        <Text style={{ marginLeft: 8, color: '#2F2F2F' }}>Gorjeta personalizada</Text>
      </View>
      {gorjetaOn && (
        <TextInput
          placeholder="Gorjeta (R$)"
          keyboardType="decimal-pad"
          value={gorjeta}
          onChangeText={setGorjeta}
          style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginTop: 12 }}
        />
      )}

      <TextInput
        placeholder="Qtd. participantes"
        keyboardType="number-pad"
        value={qtdParticipantes}
        onChangeText={setQtdParticipantes}
        style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginTop: 12 }}
      />

      {isPro && (
        <TextInput
          placeholder="Dependentes por pessoa (Pro)"
          keyboardType="number-pad"
          value={dependentesPorPessoa}
          onChangeText={setDependentesPorPessoa}
          style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginTop: 12 }}
        />
      )}

      <View style={{ marginTop: 16 }}>
        <Text style={{ color: '#2F2F2F' }}>
          Subtotal/Total calculado: R$ {totalBase.toFixed(2)}
        </Text>
      </View>

      <View style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: '600', color: '#2F2F2F' }}>Resumo por pessoa:</Text>
        {resultado.map((r) => (
          <Text key={r.pessoa} style={{ color: '#2F2F2F', marginTop: 4 }}>
            {r.pessoa}: R$ {r.valor.toFixed(2)} {isPro && r.dependentes > 0 ? `(com ${r.dependentes} dependentes)` : ''}
          </Text>
        ))}
      </View>

      <View style={{ marginTop: 20 }}>
        <Button title="Criar Divisão" onPress={handleCriarDivisao} color="#FF6B6B" />
      </View>
    </View>
  );
}