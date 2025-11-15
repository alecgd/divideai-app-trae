import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Button, Alert, ActivityIndicator, Share, Image, Modal, TouchableOpacity, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import { useUserPlan } from '../hooks/useUserPlan';
import { getDivisionItems, DivisionItem, getDivisionParticipants, DivisionParticipant } from '../services/divisions';
import type { Profile } from '../services/friends';
import { getDivisionItemConsumersByItemIds } from '../services/divisions';

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
  comprovante_url?: string | null;
  comprovante_path?: string | null;
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
  const [resolvedComprovanteUrl, setResolvedComprovanteUrl] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [items, setItems] = useState<DivisionItem[]>([]);
  const [participants, setParticipants] = useState<DivisionParticipant[]>([]);
  const [consumersByItem, setConsumersByItem] = useState<Record<string, { participant_id: string; quantidade: number }[]>>({});
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>({});

  useEffect(() => {
    loadDivision();
  }, [divisionId]);

  // Recalcula pessoas assim que participantes ou divisão mudarem
  useEffect(() => {
    if (division) {
      calculatePeople(division);
    }
  }, [participants, division, items, consumersByItem]);

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
    // Resolve URL do comprovante (assina se necessário)
    try {
      if (data.comprovante_path) {
        const { data: signed } = await supabase.storage
          .from('comprovantes')
          .createSignedUrl(data.comprovante_path, 60 * 60);
        setResolvedComprovanteUrl(signed?.signedUrl ?? null);
      } else if (data.comprovante_url) {
        setResolvedComprovanteUrl(data.comprovante_url);
      } else {
        setResolvedComprovanteUrl(null);
      }
    } catch (e) {
      // fallback para URL pública, caso assinatura falhe
      setResolvedComprovanteUrl(data.comprovante_url ?? null);
    }

    // Carrega itens se for divisão por itens
    if (data.tipo === 'itens') {
      try {
        const fetched = await getDivisionItems(divisionId);
        setItems(fetched);
        // Carrega consumo por item
        try {
          const consumers = await getDivisionItemConsumersByItemIds(fetched.map((it) => it.id as string));
          const map: Record<string, { participant_id: string; quantidade: number }[]> = {};
          for (const c of consumers || []) {
            const itemId = (c as any).division_item_id;
            if (!map[itemId]) map[itemId] = [];
            map[itemId].push({ participant_id: (c as any).participant_id, quantidade: (c as any).quantidade });
          }
          setConsumersByItem(map);
        } catch (e) {
          console.warn('Falha ao carregar consumo por item:', e);
          setConsumersByItem({});
        }
      } catch (e) {
        console.warn('Falha ao carregar itens da divisão', e);
      }
    } else {
      setItems([]);
      setConsumersByItem({});
    }

    // Carrega participantes (ambos os tipos)
    try {
      const fetchedP = await getDivisionParticipants(divisionId);
      setParticipants(fetchedP);
      // Carrega perfis vinculados por user_id para exibição
      try {
        const ids = (fetchedP.map((p) => p.user_id).filter(Boolean) as string[]);
        if (ids.length > 0) {
          const { data, error } = await supabase
            .from('profiles')
            .select('user_id,name,email,phone')
            .in('user_id', ids);
          if (error) throw error;
          const map: Record<string, Profile> = {};
          for (const row of (data || [])) {
            const r = row as unknown as Profile;
            if (r.user_id) map[r.user_id] = r;
          }
          setProfileMap(map);
        } else {
          setProfileMap({});
        }
      } catch (e) {
        console.warn('Falha ao carregar perfis vinculados', e);
        setProfileMap({});
      }
    } catch (e) {
      console.warn('Falha ao carregar participantes da divisão', e);
      setParticipants([]);
      setProfileMap({});
    }

    calculatePeople(data);
    setLoading(false);
  }

  function calculatePeople(div: DivisionDetail) {
    // Subtotal de itens: para divisão por itens usa soma de itens; para igual usa div.total
    const subtotalItens = div.tipo === 'itens'
      ? items.reduce((sum, it) => sum + it.preco * it.quantidade, 0)
      : div.total;
    const extras = (div.taxa || 0) + (div.gorjeta || 0);
    const totalComTaxas = subtotalItens + extras;

    const n = participants.length > 0 ? participants.length : 0;
    if (n <= 0) {
      setPessoas([]);
      return;
    }

    // Peso por pessoa = 1 + dependentes
    const pesos: Record<string, number> = {};
    for (const p of participants) {
      pesos[p.id as string] = 1 + (p.dependentes || 0);
    }
    const pesoTotal = Object.values(pesos).reduce((s, w) => s + w, 0) || 1;

    const valoresPorPessoa: Record<string, number> = {};

    if (div.tipo === 'itens' && Object.keys(consumersByItem).length > 0) {
      for (const it of items) {
        const consumidores = consumersByItem[it.id as string] || [];
        const totalItem = it.preco * it.quantidade;
        const numConsumidores = consumidores.length;
        if (numConsumidores > 0) {
          const parcela = totalItem / numConsumidores;
          for (const c of consumidores) {
            valoresPorPessoa[c.participant_id] = (valoresPorPessoa[c.participant_id] || 0) + parcela;
          }
        } else {
          // Sem consumidores para o item: distribui por peso
          for (const p of participants) {
            const frac = pesos[p.id as string] / pesoTotal;
            valoresPorPessoa[p.id as string] = (valoresPorPessoa[p.id as string] || 0) + totalItem * frac;
          }
        }
      }
      // Extras (taxa/gorjeta) por peso
      for (const p of participants) {
        const frac = pesos[p.id as string] / pesoTotal;
        valoresPorPessoa[p.id as string] = (valoresPorPessoa[p.id as string] || 0) + extras * frac;
      }
    } else {
      // Divisão igualitária (ou sem consumo detalhado): subtotal + extras por peso
      for (const p of participants) {
        const frac = pesos[p.id as string] / pesoTotal;
        valoresPorPessoa[p.id as string] = (subtotalItens + extras) * frac;
      }
    }

    const result: PersonResult[] = participants.map((p) => ({
      pessoa: p.nome || 'Pessoa',
      dependentes: p.dependentes || 0,
      valor: valoresPorPessoa[p.id as string] || 0,
    }));
    setPessoas(result);
  }

  async function handleEdit() {
    if (!division) return;
    // Navega para a tela correspondente com sinalização de edição
    if (division.tipo === 'itens') {
      nav.navigate('NovaDivisaoItens', { editDivisionId: division.id });
    } else {
      nav.navigate('NovaDivisaoIgual', { editDivisionId: division.id });
    }
  }

  async function handleGenerateImage() {
    if (!division) return;
    
    // Gera texto para compartilhar
    const totalComTaxas = division.total + division.taxa + division.gorjeta;
    let shareText = `🧾 Divisão - ${division.local}\n\n`;
    shareText += `💰 Total: R$ ${totalComTaxas.toFixed(2)}\n`;
    if (division.taxa > 0) shareText += `📊 Taxa: R$ ${division.taxa.toFixed(2)}\n`;
    if (division.gorjeta > 0) shareText += `💡 Gorjeta: R$ ${division.gorjeta.toFixed(2)}\n`;

    if (division.tipo === 'itens' && items.length) {
      shareText += `\n🛒 Itens:\n`;
      items.forEach((it) => {
        const subtotal = it.preco * it.quantidade;
        shareText += `• ${it.nome} x${it.quantidade} — R$ ${subtotal.toFixed(2)}\n`;
      });
    }

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
    
    if (Platform.OS === 'web') {
      // Fallback funcional para web, já que Alert com botões não é suportado
      const ok = typeof window !== 'undefined' && window.confirm('Tem certeza que deseja finalizar esta divisão? Ela não poderá mais ser editada.');
      if (ok) {
        await confirmFinalize();
      }
      return;
    }

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
  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

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

      {/* Itens da Divisão */}
      {division.tipo === 'itens' && (
        <View style={{ backgroundColor: '#FAFAFA', padding: 16, borderRadius: 12, marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#2F2F2F', marginBottom: 12 }}>
            🛒 Itens
          </Text>
          {items.length === 0 ? (
            <Text style={{ color: '#666' }}>Nenhum item cadastrado.</Text>
          ) : (
            items.map((it, idx) => (
              <View key={it.id ?? idx} style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                paddingVertical: 8,
                borderBottomWidth: idx < items.length - 1 ? 1 : 0,
                borderBottomColor: '#EEE'
              }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ color: '#2F2F2F', fontWeight: '500' }}>{it.nome}</Text>
                  <Text style={{ color: '#666', fontSize: 12 }}>x{it.quantidade} • {formatBRL(it.preco)}</Text>
                </View>
                <Text style={{ color: '#2F2F2F', fontWeight: '600' }}>{formatBRL(it.preco * it.quantidade)}</Text>
              </View>
            ))
          )}
        </View>
      )}

      {/* Divisão por Pessoa */}
      <View style={{ backgroundColor: '#FAFAFA', padding: 16, borderRadius: 12, marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#2F2F2F', marginBottom: 12 }}>
          👥 Divisão por Pessoa
        </Text>
        {pessoas.map((pessoa, index) => {
          const p = participants[index];
          const prof = p && p.user_id ? profileMap[p.user_id] : undefined;
          return (
            <View key={index} style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              paddingVertical: 8,
              borderBottomWidth: index < pessoas.length - 1 ? 1 : 0,
              borderBottomColor: '#EEE'
            }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ color: '#2F2F2F' }}>
                  {pessoa.pessoa}
                  {pessoa.dependentes > 0 && ` (+${pessoa.dependentes} dep.)`}
                </Text>
                {prof && (
                  <>
                    {!!prof.name && <Text style={{ color: '#666', fontSize: 12 }}>{prof.name}</Text>}
                    {!!prof.email && <Text style={{ color: '#666', fontSize: 12 }}>{prof.email}</Text>}
                    {!!prof.phone && <Text style={{ color: '#666', fontSize: 12 }}>{prof.phone}</Text>}
                  </>
                )}
              </View>
              <Text style={{ color: '#2F2F2F', fontWeight: '600' }}>
                R$ {pessoa.valor.toFixed(2)}
              </Text>
            </View>
          );
        })}
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
        {resolvedComprovanteUrl ? (
           <View style={{ marginTop: 12 }}>
             <Text style={{ color: '#2F2F2F', marginBottom: 8 }}>Comprovante:</Text>
             <TouchableOpacity activeOpacity={0.85} onPress={() => setShowImageModal(true)}>
               <Image
                 source={{ uri: resolvedComprovanteUrl }}
                 style={{ width: '100%', height: 240, borderRadius: 8, backgroundColor: '#EEE' }}
                 resizeMode="cover"
               />
             </TouchableOpacity>
           </View>
         ) : null}
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
      <Modal
        visible={showImageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 40, right: 20, padding: 8 }} onPress={() => setShowImageModal(false)}>
            <Text style={{ color: '#fff', fontSize: 16 }}>Fechar</Text>
          </TouchableOpacity>
          <Image
            source={{ uri: resolvedComprovanteUrl ?? '' }}
            style={{ width: '90%', height: '80%' }}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </ScrollView>
  );
}
