import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import Snackbar from '../components/Snackbar';
import {
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  searchProfiles,
  sendFriendRequest,
  acceptRequest,
  declineRequest,
  removeFriend,
  type Profile,
  type FriendRequest,
} from '../services/friends';

export default function FriendsScreen() {
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);

  const [query, setQuery] = useState('');
  const [queryError, setQueryError] = useState<string | null>(null);
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>({});
  const [myId, setMyId] = useState<string | null>(null);

  function showSnack(msg: string) {
    setSnackMsg(msg);
    setSnackVisible(true);
  }

  async function load() {
    try {
      setLoading(true);
      const [{ friends }, inc, out] = await Promise.all([
        listFriends(),
        listIncomingRequests(),
        listOutgoingRequests(),
      ]);
      setFriends(friends);
      setIncoming(inc);
      setOutgoing(out);

      // Carregar perfis relacionados aos pedidos para exibir email/nome
      const ids = Array.from(new Set([
        ...inc.map((r) => r.from_user_id),
        ...out.map((r) => r.to_user_id),
      ]));
      if (ids.length) {
        const { data: profs, error } = await supabase
          .from('profiles')
          .select('user_id,name,email,phone')
          .in('user_id', ids);
        if (!error && profs) {
          const map: Record<string, Profile> = {};
          (profs as Profile[]).forEach((p) => { map[p.user_id] = p; });
          setProfileMap(map);
        }
      } else {
        setProfileMap({});
      }
    } catch (e: any) {
      showSnack(e?.message || 'Erro ao carregar amigos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      setMyId(sessionData.session?.user.id ?? null);
    })();
  }, []);

  async function handleSearch() {
    const q = query.trim();
    if (!q || q.length < 2) {
      setQueryError('Digite ao menos 2 caracteres');
      return;
    }
    setQueryError(null);
    try {
      setSearching(true);
      const found = await searchProfiles(q, 20);
      setResults(found);
      if (!found.length) {
        showSnack('Nenhum perfil encontrado');
      }
    } catch (e: any) {
      showSnack(e?.message || 'Erro na busca');
    } finally {
      setSearching(false);
    }
  }

  async function handleSendRequest(toUserId: string) {
    try {
      await sendFriendRequest(toUserId);
      showSnack('Pedido enviado');
      await load();
    } catch (e: any) {
      showSnack(e?.message || 'Falha ao enviar pedido');
    }
  }

  async function handleAccept(id: string) {
    try {
      await acceptRequest(id);
      showSnack('Pedido aceito');
      await load();
    } catch (e: any) {
      showSnack(e?.message || 'Falha ao aceitar');
    }
  }

  async function handleDecline(id: string) {
    try {
      await declineRequest(id);
      showSnack('Pedido recusado');
      await load();
    } catch (e: any) {
      showSnack(e?.message || 'Falha ao recusar');
    }
  }

  async function handleRemoveFriend(userId: string) {
    try {
      await removeFriend(userId);
      showSnack('Amigo removido');
      await load();
    } catch (e: any) {
      showSnack(e?.message || 'Falha ao remover');
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '500', color: '#2F2F2F' }}>Meus Amigos</Text>

      {/* Busca */}
      <View style={{ marginTop: 12 }}>
        <Text style={{ color: '#2F2F2F', marginBottom: 6 }}>Buscar perfis</Text>
        <TextInput
          placeholder="Digite email, telefone (DDD+NÚMERO) ou nome"
          value={query}
          onChangeText={setQuery}
          style={{ borderWidth: 1, borderColor: queryError ? '#FF6B6B' : '#DDD', borderRadius: 8, padding: 10 }}
        />
        {queryError && <Text style={{ color: '#FF6B6B', marginTop: 4 }}>{queryError}</Text>}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <TouchableOpacity onPress={handleSearch} style={{ backgroundColor: '#FF6B6B', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 }}>
            <Text style={{ color: '#FFF', fontWeight: '600' }}>{searching ? 'BUSCANDO...' : 'BUSCAR'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setResults([]); setQuery(''); setQueryError(null); }} style={{ backgroundColor: '#EEE', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 }}>
            <Text style={{ color: '#2F2F2F' }}>LIMPAR</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Resultados da busca */}
      {results.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: '#2F2F2F', marginBottom: 6 }}>Resultados</Text>
          <FlatList
            data={results.filter((r) => r.user_id !== myId)}
            keyExtractor={(item) => item.user_id}
            renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EEE', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#2F2F2F', fontWeight: '500' }}>{item.name || item.email || item.phone || 'Sem nome'}</Text>
                  {!!item.email && <Text style={{ color: '#666' }}>{item.email}</Text>}
                  {!!item.phone && <Text style={{ color: '#666' }}>{item.phone}</Text>}
                </View>
                {(() => {
                  const isMe = item.user_id === myId;
                  const isFriend = friends.some((f) => f.user_id === item.user_id);
                  const hasOutgoing = outgoing.some((r) => r.to_user_id === item.user_id && r.status === 'pending');
                  const hasIncoming = incoming.some((r) => r.from_user_id === item.user_id && r.status === 'pending');
                  let label = 'PEDIR AMIZADE';
                  let disabled = false;
                  let onPress = () => handleSendRequest(item.user_id);
                  if (isMe) { label = 'VOCÊ'; disabled = true; onPress = () => {}; }
                  else if (isFriend) { label = 'JÁ AMIGOS'; disabled = true; onPress = () => {}; }
                  else if (hasOutgoing) { label = 'PEDIDO ENVIADO'; disabled = true; onPress = () => {}; }
                  else if (hasIncoming) { label = 'TEM PEDIDO'; disabled = true; onPress = () => {}; }
                  return (
                    <TouchableOpacity onPress={onPress} disabled={disabled} style={{ backgroundColor: disabled ? '#CCC' : '#FF6B6B', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
                      <Text style={{ color: '#FFF' }}>{label}</Text>
                    </TouchableOpacity>
                  );
                })()}
              </View>
            )}
          />
        </View>
      )}

      {/* Amigos */}
      <View style={{ marginTop: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: '500', color: '#2F2F2F' }}>Amigos</Text>
        {friends.length === 0 ? (
          <Text style={{ color: '#666', marginTop: 6 }}>Você ainda não tem amigos.</Text>
        ) : (
          <FlatList
            style={{ marginTop: 6 }}
            data={friends}
            keyExtractor={(item) => item.user_id}
            renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EEE', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#2F2F2F', fontWeight: '500' }}>{item.name || item.email || item.phone || 'Sem nome'}</Text>
                  {!!item.email && <Text style={{ color: '#666' }}>{item.email}</Text>}
                  {!!item.phone && <Text style={{ color: '#666' }}>{item.phone}</Text>}
                </View>
                <TouchableOpacity onPress={() => handleRemoveFriend(item.user_id)} style={{ backgroundColor: '#EEE', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
                  <Text style={{ color: '#2F2F2F' }}>REMOVER</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>

      {/* Pedidos recebidos */}
      <View style={{ marginTop: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: '500', color: '#2F2F2F' }}>Pedidos recebidos</Text>
        {incoming.length === 0 ? (
          <Text style={{ color: '#666', marginTop: 6 }}>Nenhum pedido pendente.</Text>
        ) : (
          <FlatList
            style={{ marginTop: 6 }}
            data={incoming}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EEE', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#2F2F2F' }}>
                    De: {profileMap[item.from_user_id]?.email || profileMap[item.from_user_id]?.phone || item.from_user_id}
                  </Text>
                  <Text style={{ color: '#666' }}>Status: {item.status}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => handleAccept(item.id)} style={{ backgroundColor: '#4CAF50', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
                    <Text style={{ color: '#FFF' }}>ACEITAR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDecline(item.id)} style={{ backgroundColor: '#FF6B6B', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
                    <Text style={{ color: '#FFF' }}>RECUSAR</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* Pedidos enviados */}
      <View style={{ marginTop: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: '500', color: '#2F2F2F' }}>Pedidos enviados</Text>
        {outgoing.length === 0 ? (
          <Text style={{ color: '#666', marginTop: 6 }}>Você não possui pedidos enviados pendentes.</Text>
        ) : (
          <FlatList
            style={{ marginTop: 6 }}
            data={outgoing}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EEE', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#2F2F2F' }}>
                    Para: {profileMap[item.to_user_id]?.email || profileMap[item.to_user_id]?.phone || item.to_user_id}
                  </Text>
                  <Text style={{ color: '#666' }}>Status: {item.status}</Text>
                </View>
              </View>
            )}
          />
        )}
      </View>

      <Snackbar visible={snackVisible} message={snackMsg} onDismiss={() => setSnackVisible(false)} />
    </View>
  );
}
