import React, { useEffect, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Pressable, Button } from 'react-native';
import { supabase } from '../lib/supabaseClient';

type DivisionRow = {
  id: string;
  tipo: 'igual' | 'itens';
  local: string;
  total: number;
  created_at: string;
  status: 'ativa' | 'finalizada';
};

export default function HistoryScreen() {
  const nav = useNavigation<any>();
  const [items, setItems] = useState<DivisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // UI: painel de filtros colapsado
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);

  // Filtros (UI temporários)
  const [monthFilterUI, setMonthFilterUI] = useState<'current' | 'previous' | 'all'>('all');
  const [statusFilterUI, setStatusFilterUI] = useState<'all' | 'ativa' | 'finalizada'>('all');

  // Filtros aplicados (consulta)
  const [monthFilter, setMonthFilter] = useState<'current' | 'previous' | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativa' | 'finalizada'>('all');

  // Ordenação: dropdown fechado por padrão; abre ao clicar; ao selecionar, aplica e fecha.
  type OrderMode = 'recentes' | 'antigas' | 'ativas_primeiro' | 'finalizadas_primeiro';
  const [orderMode, setOrderMode] = useState<OrderMode>('recentes');
  const [orderOpen, setOrderOpen] = useState<boolean>(false);

  async function load() {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Período aplicado
    let startISO: string | null = null;
    let endISO: string | null = null;
    const now = new Date();
    if (monthFilter === 'current') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      startISO = start.toISOString();
      endISO = end.toISOString();
    } else if (monthFilter === 'previous') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 1);
      startISO = start.toISOString();
      endISO = end.toISOString();
    }

    let query = supabase
      .from('divisions')
      .select('id, tipo, local, total, created_at, status')
      .eq('criador_id', userId);

    if (startISO && endISO) {
      query = query.gte('created_at', startISO).lt('created_at', endISO);
    }
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    // Ordenação
    if (orderMode === 'recentes') {
      query = query.order('created_at', { ascending: false });
    } else if (orderMode === 'antigas') {
      query = query.order('created_at', { ascending: true });
    } else if (orderMode === 'ativas_primeiro') {
      // 'ativa' antes de 'finalizada' (alfabético asc) e por data desc
      query = query.order('status', { ascending: true }).order('created_at', { ascending: false });
    } else if (orderMode === 'finalizadas_primeiro') {
      // 'finalizada' antes de 'ativa' (alfabético desc) e por data desc
      query = query.order('status', { ascending: false }).order('created_at', { ascending: false });
    }

    // Aumenta limite para evitar truncar resultados antigos
    query = query.limit(200);

    const { data, error } = await query;
    if (error) setItems([]);
    else setItems(data ?? []);
    setLoading(false);
  }

  function handleApplyFilters() {
    setMonthFilter(monthFilterUI);
    setStatusFilter(statusFilterUI);
    // Removido: load();
  }

  function handleClearFilters() {
    setMonthFilterUI('all');
    setStatusFilterUI('all');
    setMonthFilter('all');
    setStatusFilter('all');
    // Removido: load();
  }

  // Dispara load quando filtros aplicados mudarem
  useEffect(() => {
    load();
  }, [monthFilter, statusFilter]);

  // Dispara load quando ordenação mudar (aplica imediatamente)
  useEffect(() => {
    load();
  }, [orderMode]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    async function subscribe() {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return;

      channel = supabase
        .channel('divisions-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'divisions' }, (payload) => {
          if (mounted && payload.new?.criador_id === userId) load();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'divisions' }, (payload) => {
          const cid = payload.new?.criador_id ?? payload.old?.criador_id;
          if (mounted && cid === userId) load();
        })
        .subscribe();
    }
    subscribe();
    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '500', color: '#2F2F2F' }}>Histórico</Text>

      {/* Botão para abrir/fechar filtros (colapsado por padrão) */}
      <View style={{ marginTop: 10 }}>
        <Button
          title={filtersOpen ? 'Esconder filtros' : 'Filtrar'}
          color="#FF6B6B"
          onPress={() => setFiltersOpen((v) => !v)}
        />
      </View>

      {/* Painel de filtros */}
      {filtersOpen && (
        <View style={{ marginTop: 10, padding: 12, borderRadius: 8, backgroundColor: '#FAFAFA' }}>
          {/* Período */}
          <Text style={{ color: '#2F2F2F', marginBottom: 6 }}>Período</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {[
              { k: 'current', label: 'Mês atual' },
              { k: 'previous', label: 'Mês anterior' },
              { k: 'all', label: 'Todos os períodos' },
            ].map((opt) => (
              <Pressable
                key={opt.k}
                onPress={() => setMonthFilterUI(opt.k as any)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 16,
                  marginRight: 8,
                  marginBottom: 8,
                  backgroundColor: monthFilterUI === opt.k ? '#FF6B6B' : '#EEE',
                }}
              >
                <Text style={{ color: monthFilterUI === opt.k ? '#FFF' : '#2F2F2F' }}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Status */}
          <Text style={{ color: '#2F2F2F', marginBottom: 6, marginTop: 8 }}>Status</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {[
              { k: 'all', label: 'Todas' },
              { k: 'ativa', label: 'Ativas' },
              { k: 'finalizada', label: 'Finalizadas' },
            ].map((opt) => (
              <Pressable
                key={opt.k}
                onPress={() => setStatusFilterUI(opt.k as any)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 16,
                  marginRight: 8,
                  marginBottom: 8,
                  backgroundColor: statusFilterUI === opt.k ? '#FF6B6B' : '#EEE',
                }}
              >
                <Text style={{ color: statusFilterUI === opt.k ? '#FFF' : '#2F2F2F' }}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Ações dos filtros */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Button title="FILTRAR" color="#FF6B6B" onPress={handleApplyFilters} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="LIMPAR FILTROS" color="#999999" onPress={handleClearFilters} />
            </View>
          </View>
        </View>
      )}

      {/* Ordenação (dropdown - fechado por padrão; abre ao clicar; aplica imediatamente) */}
      <View style={{ marginTop: 12 }}>
        <Text style={{ color: '#2F2F2F', marginBottom: 6 }}>Ordenação</Text>
        <View style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8 }}>
          <Pressable
            onPress={() => setOrderOpen((v) => !v)}
            style={{ padding: 12, backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <Text style={{ color: '#2F2F2F' }}>
              {orderMode === 'recentes'
                ? 'Mais recentes'
                : orderMode === 'antigas'
                ? 'Mais antigas'
                : orderMode === 'ativas_primeiro'
                ? 'Ativas primeiro'
                : 'Finalizadas primeiro'}
            </Text>
            <Text style={{ color: '#666' }}>{orderOpen ? '▲' : '▼'}</Text>
          </Pressable>

          {orderOpen && (
            <View style={{ borderTopWidth: 1, borderTopColor: '#EEE' }}>
              {[
                { k: 'recentes', label: 'Mais recentes' },
                { k: 'antigas', label: 'Mais antigas' },
                { k: 'ativas_primeiro', label: 'Ativas primeiro' },
                { k: 'finalizadas_primeiro', label: 'Finalizadas primeiro' },
              ].map((opt) => (
                <Pressable
                  key={opt.k}
                  onPress={() => {
                    setOrderMode(opt.k as OrderMode);
                    setOrderOpen(false);
                    // Removido: load();
                  }}
                  style={{
                    padding: 12,
                    backgroundColor: orderMode === opt.k ? '#FFF1EF' : '#FFF',
                  }}
                >
                  <Text style={{ color: '#2F2F2F' }}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Lista ou mensagem de zero resultados */}
      {items.length === 0 ? (
        <View style={{ marginTop: 16, padding: 12, borderRadius: 8, backgroundColor: '#FFF1EF' }}>
          <Text style={{ color: '#2F2F2F' }}>
            Nenhum resultado para os filtros aplicados. Ajuste os filtros e toque em FILTRAR.
          </Text>
        </View>
      ) : (
        <FlatList
          style={{ marginTop: 12 }}
          data={items}
          keyExtractor={(it) => it.id}
          onRefresh={onRefresh}
          refreshing={refreshing}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{ marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: '#FAFAFA' }}
              onPress={() => nav.navigate('DetalheDivisao', { divisionId: item.id })}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#2F2F2F', fontWeight: '600' }}>{item.local}</Text>
                <View
                  style={{
                    backgroundColor: item.status === 'ativa' ? '#E8F5E8' : '#F5F5F5',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{
                      color: item.status === 'ativa' ? '#2E7D32' : '#666',
                      fontSize: 12,
                      fontWeight: '500',
                    }}
                  >
                    {item.status === 'ativa' ? 'ATIVA' : 'FINALIZADA'}
                  </Text>
                </View>
              </View>
              <Text style={{ color: '#2F2F2F' }}>Tipo: {item.tipo}</Text>
              <Text style={{ color: '#2F2F2F' }}>Total: R$ {item.total.toFixed(2)}</Text>
              <Text style={{ color: '#2F2F2F' }}>
                Criada: {new Date(item.created_at).toLocaleString()}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}