import React, { useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabaseClient';

type DivisionRow = {
  id: string;
  tipo: 'igual' | 'itens';
  local: string;
  total: number;
  created_at: string;
};

export default function HistoryScreen() {
  const [items, setItems] = useState<DivisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('divisions')
      .select('id, tipo, local, total, created_at')
      .eq('criador_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) setItems([]);
    else setItems(data ?? []);
    setLoading(false);
  }

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
          if (mounted && payload.new?.criador_id === userId) {
            load();
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'divisions' }, (payload) => {
          const cid = payload.new?.criador_id ?? payload.old?.criador_id;
          if (mounted && cid === userId) {
            load();
          }
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

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '500', color: '#2F2F2F' }}>Histórico</Text>
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          onRefresh={onRefresh}
          refreshing={refreshing}
          renderItem={({ item }) => (
            <View style={{ marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: '#FAFAFA' }}>
              <Text style={{ color: '#2F2F2F', fontWeight: '600' }}>{item.local}</Text>
              <Text style={{ color: '#2F2F2F' }}>Tipo: {item.tipo}</Text>
              <Text style={{ color: '#2F2F2F' }}>Total: R$ {item.total.toFixed(2)}</Text>
              <Text style={{ color: '#2F2F2F' }}>
                Criada: {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '500', color: '#2F2F2F' }}>Histórico</Text>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        onRefresh={onRefresh}
        refreshing={refreshing}
        renderItem={({ item }) => (
          <View style={{ marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: '#FAFAFA' }}>
            <Text style={{ color: '#2F2F2F', fontWeight: '600' }}>{item.local}</Text>
            <Text style={{ color: '#2F2F2F' }}>Tipo: {item.tipo}</Text>
            <Text style={{ color: '#2F2F2F' }}>Total: R$ {item.total.toFixed(2)}</Text>
            <Text style={{ color: '#2F2F2F' }}>
              Criada: {new Date(item.created_at).toLocaleString()}
            </Text>
          </View>
        )}
      />
    </View>
  );
}