import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Button, Alert, ActivityIndicator, Share } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import { useUserPlan } from '../hooks/useUserPlan';

type DivisionDetail = {
  id: string;
  tipo: 'igual' | 'itens';
  local: string;
  data: string | null;
  total: number;
  taxa: number;
  gorjeta: number;
  criador_id: string;
  status: 'ativa' | 'finalizada';
  created_at: string;
};

type PersonResult = {
  pessoa: string;
  dependentes: number;
  valor: number;
};

export default function DivisionDetailScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const { isPro } = useUserPlan();
  const { divisionId } = route.params;
  
  const [division, setDivision] = useState<DivisionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pessoas, setPessoas] = useState<PersonResult[]>([]);

  useEffect(() => {
    loadDivision();
  }, [divisionId]);

  async function loadDivision() {
    setLoading(true);
    const { data, error } = await supabase
      .from('divisions')
      .select('*')
      .eq('id', divisionId)
      .maybeSingle();
    
    if (error || !data) {
      Alert.alert('Erro', 'Divisão não encontrada');
      nav.goBack();
      return;
    }
    
    setDivision(data);
    calculatePeople(data);
    setLoading(false);
  }

  function calculatePeople(div: DivisionDetail) {
    if (div.tipo === 'igual') {
      // Para divisão igual, assumimos 2 participantes por padrão
      // Em uma implementação completa, isso viria dos dados salvos
      const participantes = 2;
      const dependentes = isPro ? 0 : 0; // Simplificado para demo
      const totalComTaxas = div.total + div.taxa + div.gorjeta;
      const valorPorPessoa = totalComTaxas / participantes;
      
      const result: PersonResult[] = Array.from({ length: participantes }).map((_, idx) => ({
        pessoa: `Pessoa ${idx + 1}`,
        dependentes,
        valor: valorPorPessoa,
      }));
      
      setPessoas(result);
    }
  }

  async function handleEdit() {
    Alert.alert('Editar', 'Funcionalidade de edição será implementada em breve');
  }

  async function handleGenerateImage() {
    if (!division) return;
    
    // Gera texto para compartilhar
    const totalComTaxas = division.total + division.taxa + division.gorjeta;
    let shareText = `🧾 Divisão - ${division.local}\n\n`;
    shareText += `💰 Total: R$ ${totalComTaxas.toFixed(2)}\n`;
    if (division.taxa > 0) shareText += `📊 Taxa: R$ ${division.taxa.toFixed(2)}\n`;
    if (division.gorjeta > 0) shareText += `💡 Gorjeta: R$ ${division.gorjeta.toFixed(2)}\n`;
    shareText += `\n👥 Divisão por pessoa:\n`;
    
    pessoas.forEach((p) => {
      shareText += `• ${p.pessoa}: R$ ${p.valor.toFixed(2)}\n`;
    });
    
    shareText += `\n📅 Criada em: ${new Date(division.created_at).toLocaleString()}`;
    shareText += `\n\n📱 Gerado pelo DivideAI`;

    try {
      await Share.share({
        message: shareText,
        title: `Divisão - ${division.local}`,
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível compartilhar');
    }
  }

  async function handleFinalize() {
    if (!division) return;
    
    Alert.alert(
      'Finalizar Divisão',
      'Tem certeza que deseja finalizar esta divisão? Ela não poderá mais ser editada.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Finalizar', style: 'destructive', onPress: confirmFinalize },
      ]
    );
  }

  async function confirmFinalize() {
    if (!division) return;
    
    const { error } = await supabase
      .from('divisions')
      .update({ status: 'finalizada' })
      .eq('id', division.id);
    
    if (error) {
      Alert.alert('Erro', 'Não foi possível finalizar a divisão');
    } else {
      Alert.alert('Sucesso', 'Divisão finalizada com sucesso');
      loadDivision(); // Recarrega para atualizar o status
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!division) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Divisão não encontrada</Text>
      </View>
    );
  }

  const totalComTaxas = division.total + division.taxa + division.gorjeta;
  const isActive = division.status === 'ativa';

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      {/* Cabeçalho */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: '600', color: '#2F2F2F' }}>
          {division.local}
        </Text>
        <Text style={{ fontSize: 16, color: '#666', marginTop: 4 }}>
          {division.tipo === 'igual' ? 'Divisão Igualitária' : 'Divisão por Itens'}
        </Text>
        <View style={{ 
          backgroundColor: isActive ? '#E8F5E8' : '#F5F5F5', 
          paddingHorizontal: 8, 
          paddingVertical: 4, 
          borderRadius: 12, 
          alignSelf: 'flex-start',
          marginTop: 8 
        }}>
          <Text style={{ 
            color: isActive ? '#2E7D32' : '#666', 
            fontSize: 12, 
            fontWeight: '500' 
          }}>
            {isActive ? 'ATIVA' : 'FINALIZADA'}
          </Text>
        </View>
      </View>

      {/* Resumo Financeiro */}
      <View style={{ backgroundColor: '#FAFAFA', padding: 16, borderRadius: 12, marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#2F2F2F', marginBottom: 12 }}>
          💰 Resumo Financeiro
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: '#2F2F2F' }}>Subtotal:</Text>
          <Text style={{ color: '#2F2F2F', fontWeight: '500' }}>R$ {division.total.toFixed(2)}</Text>
        </View>
        {division.taxa > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: '#2F2F2F' }}>Taxa de serviço:</Text>
            <Text style={{ color: '#2F2F2F', fontWeight: '500' }}>R$ {division.taxa.toFixed(2)}</Text>
          </View>
        )}
        {division.gorjeta > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: '#2F2F2F' }}>Gorjeta:</Text>
            <Text style={{ color: '#2F2F2F', fontWeight: '500' }}>R$ {division.gorjeta.toFixed(2)}</Text>
          </View>
        )}
        <View style={{ height: 1, backgroundColor: '#DDD', marginVertical: 8 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: '#2F2F2F', fontSize: 16, fontWeight: '600' }}>Total:</Text>
          <Text style={{ color: '#FF6B6B', fontSize: 16, fontWeight: '600' }}>
            R$ {totalComTaxas.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Divisão por Pessoa */}
      <View style={{ backgroundColor: '#FAFAFA', padding: 16, borderRadius: 12, marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#2F2F2F', marginBottom: 12 }}>
          👥 Divisão por Pessoa
        </Text>
        {pessoas.map((pessoa, index) => (
          <View key={index} style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            paddingVertical: 8,
            borderBottomWidth: index < pessoas.length - 1 ? 1 : 0,
            borderBottomColor: '#EEE'
          }}>
            <Text style={{ color: '#2F2F2F' }}>
              {pessoa.pessoa}
              {pessoa.dependentes > 0 && ` (+${pessoa.dependentes} dep.)`}
            </Text>
            <Text style={{ color: '#2F2F2F', fontWeight: '600' }}>
              R$ {pessoa.valor.toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      {/* Informações Adicionais */}
      <View style={{ backgroundColor: '#FAFAFA', padding: 16, borderRadius: 12, marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#2F2F2F', marginBottom: 12 }}>
          📋 Informações
        </Text>
        {division.data && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: '#2F2F2F' }}>Data:</Text>
            <Text style={{ color: '#2F2F2F' }}>{new Date(division.data).toLocaleDateString()}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: '#2F2F2F' }}>Criada em:</Text>
          <Text style={{ color: '#2F2F2F' }}>{new Date(division.created_at).toLocaleString()}</Text>
        </View>
      </View>

      {/* Ações */}
      <View style={{ gap: 12, marginBottom: 20 }}>
        <Button
          title="📤 Gerar Imagem / Compartilhar"
          onPress={handleGenerateImage}
          color="#45B7D1"
        />
        
        {isActive && (
          <>
            <Button
              title="✏️ Editar Divisão"
              onPress={handleEdit}
              color="#FF6B6B"
            />
            <Button
              title="✅ Finalizar Divisão"
              onPress={handleFinalize}
              color="#4CAF50"
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}