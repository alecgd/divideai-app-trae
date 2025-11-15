import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, TextInput, Switch, Button, Alert, ScrollView, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useUserPlan } from '../hooks/useUserPlan';
import { useNavigation, useRoute } from '@react-navigation/native';
import ImagePicker from '../components/ImagePicker';
import Snackbar from '../components/Snackbar';
import { uploadComprovante, getSignedComprovanteUrl } from '../services/storage';
import { supabase } from '../lib/supabaseClient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { insertDivisionParticipants, getDivisionById, getDivisionParticipants, updateDivisionBasic, applyDivisionParticipantsTransactional } from '../services/divisions';
import { logEvent } from '../services/telemetry';
import { listFriends, type Profile } from '../services/friends';

export default function NewDivisionEqualScreen() {
  const { isPro } = useUserPlan();
  const [local, setLocal] = useState('');
  const route = useRoute<any>();
  const editDivisionId: string | undefined = route?.params?.editDivisionId;
  const isEdit = !!editDivisionId;

  // Data: manter ISO para salvar (YYYY-MM-DD) e mostrar em BR (dd/mm/aaaa)
  const pad = (n: number) => String(n).padStart(2, '0');
  const today = new Date();
  const initialISO = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const initialBR = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;
  const [dataISO, setDataISO] = useState<string>(initialISO);
  const [dataBR, setDataBR] = useState<string>(initialBR);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  // Refs e erros de campos para validação visual e rolagem
  const scrollRef = useRef<ScrollView>(null);
  const fieldPositions = useRef<Record<string, number>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Total com máscara em BRL
  const formatBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [totalDisplay, setTotalDisplay] = useState<string>('');
  const handleTotalChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    const value = (parseInt(digits || '0', 10)) / 100;
    setTotalValue(value);
    setTotalDisplay(value > 0 ? formatBRL(value) : '');
  };

  const [taxa10, setTaxa10] = useState<boolean>(false);
  const [taxaPercent, setTaxaPercent] = useState<number>(10);
  const [taxaPercentStr, setTaxaPercentStr] = useState<string>('10');
  const [gorjetaOn, setGorjetaOn] = useState<boolean>(false);
  // Máscara BRL para Gorjeta
  const [gorjetaValue, setGorjetaValue] = useState<number>(0);
  const [gorjetaDisplay, setGorjetaDisplay] = useState<string>('');
  const handleGorjetaChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    const value = (parseInt(digits || '0', 10)) / 100;
    setGorjetaValue(value);
    setGorjetaDisplay(value > 0 ? formatBRL(value) : '');
  };
  const [qtdParticipantes, setQtdParticipantes] = useState<string>('2');

  const [nomes, setNomes] = useState<string[]>(['Pessoa 1', 'Pessoa 2']);
// Dependentes por pessoa como lista por participante; persistimos apenas a contagem
const [dependentesPorPessoaLista, setDependentesPorPessoaLista] = useState<string[][]>([[], []]);
  const syncNomes = (n: number) => {
    if (n <= 0) return setNomes([]);
    setNomes((prev) => {
      const next = [...prev];
      while (next.length < n) next.push(`Pessoa ${next.length + 1}`);
      if (next.length > n) next.length = n;
      return next;
    });
  };
const syncDependentes = (n: number) => {
  setDependentesPorPessoaLista((prev) => {
    const next = [...prev];
    while (next.length < n) next.push([]);
    if (next.length > n) next.length = n;
    return next;
  });
};
const addDependente = (pIdx: number) => {
  setDependentesPorPessoaLista((prev) => {
    const next = [...prev];
    const atual = next[pIdx] || [];
    next[pIdx] = [...atual, `Dependente ${atual.length + 1}`];
    return next;
  });
};
const updateDependenteNome = (pIdx: number, dIdx: number, nome: string) => {
  setDependentesPorPessoaLista((prev) => {
    const next = [...prev];
    const atual = next[pIdx] || [];
    next[pIdx] = atual.map((d, i) => (i === dIdx ? nome : d));
    return next;
  });
};
  const [comprovanteUri, setComprovanteUri] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [snackVisible, setSnackVisible] = useState<boolean>(false);
  const [snackMessage, setSnackMessage] = useState<string>('');

  // Amigos para preencher participantes
  const [friendsOpen, setFriendsOpen] = useState<boolean>(false);
  const [friendsLoading, setFriendsLoading] = useState<boolean>(false);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [participantUserIds, setParticipantUserIds] = useState<(string | null)[]>([null, null]);
  const friendDisplay = (f: Profile) => (f.name?.trim() || f.email || f.phone || 'Amigo');
  const loadFriends = async () => {
    try {
      setFriendsLoading(true);
      const { friends } = await listFriends();
      setFriends(friends || []);
    } catch (e: any) {
      setSnackMessage(e?.message || 'Erro ao carregar amigos');
      setSnackVisible(true);
    } finally {
      setFriendsLoading(false);
    }
  };
  const syncUserIds = (n: number) => {
    setParticipantUserIds((prev) => {
      const next = [...prev];
      while (next.length < n) next.push(null);
      if (next.length > n) next.length = n;
      return next;
    });
  };
  const toggleFriendSelected = (id: string) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const addFriendAsParticipant = (f: Profile) => {
    const nome = friendDisplay(f);
    if (!nome) return;
    setNomes((prev) => {
      if (prev.includes(nome)) {
        setSnackMessage('Participante já adicionado');
        setSnackVisible(true);
        return prev;
      }
      const current = Math.max(0, parseInt(qtdParticipantes || '0', 10));
      const novoTotal = current + 1;
      setQtdParticipantes(String(novoTotal));
      const next = [...prev, nome];
      // garantir tamanho correto
      while (next.length < novoTotal) next.push(`Pessoa ${next.length + 1}`);
      if (next.length > novoTotal) next.length = novoTotal;
      // sincronizar dependentes
      syncDependentes(novoTotal);
      // sincronizar user_ids
      setParticipantUserIds((prevIds) => {
        const ids = [...prevIds, f.user_id || null];
        while (ids.length < novoTotal) ids.push(null);
        if (ids.length > novoTotal) ids.length = novoTotal;
        return ids;
      });
      return next;
    });
  };
  const addSelectedFriends = () => {
    const selected = friends.filter((f) => selectedFriendIds.has(f.user_id));
    if (!selected.length) return;
    const current = Math.max(0, parseInt(qtdParticipantes || '0', 10));
    let nextNames = [...nomes];
    let nextIds = [...participantUserIds];
    for (const f of selected) {
      const nome = friendDisplay(f);
      if (!nextNames.includes(nome)) {
        nextNames.push(nome);
        nextIds.push(f.user_id || null);
      }
    }
    const novoTotal = Math.max(current, nextNames.length);
    while (nextNames.length < novoTotal) nextNames.push(`Pessoa ${nextNames.length + 1}`);
    while (nextIds.length < novoTotal) nextIds.push(null);
    nextNames.length = novoTotal;
    nextIds.length = novoTotal;
    setQtdParticipantes(String(novoTotal));
    setNomes(nextNames);
    setParticipantUserIds(nextIds);
    syncDependentes(novoTotal);
    setSelectedFriendIds(new Set());
    setSnackMessage('Amigos adicionados');
    setSnackVisible(true);
  };

  const totalBase = useMemo(() => {
    const t = totalValue;
    const g = gorjetaOn ? gorjetaValue : 0;
    const taxa = taxa10 ? t * (taxaPercent / 100) : 0;
    return t + taxa + g;
  }, [totalValue, gorjetaOn, gorjetaValue, taxa10, taxaPercent]);


  const resultado = useMemo(() => {
    const participantes = parseInt(qtdParticipantes || '0', 10);
    if (participantes <= 0 || totalBase <= 0) return [];
    const pesos = Array.from({ length: participantes }).map((_, idx) => 1 + (dependentesPorPessoaLista[idx]?.length || 0));
    const somaPesos = pesos.reduce((a, b) => a + b, 0);
    if (somaPesos <= 0) return [];
    const valorPorPeso = totalBase / somaPesos;
    return Array.from({ length: participantes }).map((_p, idx) => ({
      pessoa: (nomes[idx] || `Pessoa ${idx + 1}`),
      dependentes: (dependentesPorPessoaLista[idx]?.length || 0),
      valor: +(valorPorPeso * pesos[idx]).toFixed(2),
    }));
  }, [qtdParticipantes, dependentesPorPessoaLista, totalBase, nomes]);

  const camposValidos =
    local.trim().length > 0 &&
    parseInt(qtdParticipantes || '0', 10) > 0 &&
    (!gorjetaOn || gorjetaValue >= 0);

  function validateAndScroll(): boolean {
    const errs: Record<string, string> = {};
    if (local.trim().length === 0) errs.local = 'Informe o local';
    if (!(parseInt(qtdParticipantes || '0', 10) > 0)) errs.participantes = 'Informe ao menos 1 participante';
    setFieldErrors(errs);
    const firstKey = ['local', 'total', 'participantes'].find((k) => errs[k]);
    if (firstKey) {
      const y = fieldPositions.current[firstKey] ?? 0;
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
      setSnackMessage('Corrija os campos destacados.');
      setSnackVisible(true);
      return false;
    }
    return true;
  }

  const nav = useNavigation<any>();
  async function handleCriarDivisao() {
    if (!camposValidos) {
      if (!validateAndScroll()) return;
    }
    try {
      setUploading(true);
      const t = totalValue;
      const taxa = taxa10 ? t * (taxaPercent / 100) : 0;
      const g = gorjetaOn ? gorjetaValue : 0;

      // Upload do comprovante se houver
      let comprovanteUrl, comprovantePath;
      if (comprovanteUri) {
        const { data: userData } = await supabase.auth.getSession();
        if (userData.session?.user.id) {
          const upload = await uploadComprovante(comprovanteUri, userData.session.user.id);
          comprovanteUrl = upload.url;
          comprovantePath = upload.path;
        }
      }

      const { createDivisionEqual } = await import('../services/divisions');
      const created = await createDivisionEqual({
        tipo: 'igual',
        local,
        data: dataISO || undefined,
        total: t,
        taxa,
        gorjeta: g,
        comprovante_url: comprovanteUrl,
        comprovante_path: comprovantePath,
      });

      // Persiste participantes (nomes e dependentes por pessoa)
      if (created?.id) {
        const participantesCount = Math.max(1, parseInt(qtdParticipantes || '0', 10));
        const participantesPayload = Array.from({ length: participantesCount }).map((_x, i) => ({
          nome: (nomes[i] || `Pessoa ${i + 1}`),
          dependentes: (dependentesPorPessoaLista[i]?.length || 0),
          user_id: participantUserIds[i] || null,
        }));
        try {
          await insertDivisionParticipants(created.id, participantesPayload);
        } catch (e) {
          console.warn('Falha ao salvar participantes:', e);
          Alert.alert('Aviso', 'Divisão criada, mas houve erro ao salvar participantes.');
        }
      }

      Alert.alert('Divisão criada com sucesso!', `ID: ${created?.id}`);
      // Navega para a aba Histórico dentro do Tabs (navigator aninhado)
      nav.navigate('Tabs', { screen: 'Histórico' });
    } catch (e: any) {
      Alert.alert('Erro ao criar divisão', e.message ?? 'Tente novamente');
    } finally {
      setUploading(false);
    }
  }

  const onDateChange = (event: any, selected?: Date) => {
    // No Android o picker é modal, fechamos ao escolher ou cancelar
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) {
      const y = selected.getFullYear();
      const m = pad(selected.getMonth() + 1);
      const d = pad(selected.getDate());
      setDataISO(`${y}-${m}-${d}`);
      setDataBR(`${d}/${m}/${y}`);
    }
  };

  // Carregar dados para edição
  useEffect(() => {
    if (!isEdit || !editDivisionId) return;
    (async () => {
      try {
        const division = await getDivisionById(editDivisionId);
        if (division) {
          setLocal(division.local || '');
          const dataStr: string | undefined = division.data || undefined;
          if (dataStr) {
            setDataISO(dataStr);
            const [y, m, d] = dataStr.split('-');
            setDataBR(`${d}/${m}/${y}`);
          }
          const t = Number(division.total || 0);
          setTotalValue(t);
          setTotalDisplay(t > 0 ? formatBRL(t) : '');
          const taxaNum = Number(division.taxa || 0);
          const gorjetaNum = Number(division.gorjeta || 0);
          setTaxa10(taxaNum > 0);
          setGorjetaOn(gorjetaNum > 0);
          setGorjetaValue(gorjetaNum);
          setGorjetaDisplay(gorjetaNum > 0 ? formatBRL(gorjetaNum) : '');
          // Comprovante existente
          const path = division.comprovante_path as string | undefined;
          const url = division.comprovante_url as string | undefined;
          if (path) {
            const signed = await getSignedComprovanteUrl(path);
            if (signed) setComprovanteUri(signed);
          } else if (url) {
            setComprovanteUri(url);
          }
          // Inicializa taxaPercent com base no total carregado
          if (taxaNum > 0 && t > 0) {
            const pct = Math.round((taxaNum / t) * 100);
            setTaxaPercent(pct);
            setTaxaPercentStr(String(pct));
            setTaxa10(true);
          }
        }
        const parts = await getDivisionParticipants(editDivisionId);
        setQtdParticipantes(String(Math.max(1, parts.length)));
        setNomes(parts.map((p, i) => p.nome || `Pessoa ${i + 1}`));
        setParticipantUserIds(parts.map((p: any) => p.user_id || null));
        const dependentesArrays = parts.map((p) => {
          const count = p.dependentes || 0;
          return Array.from({ length: count }).map((_x, i) => `Dependente ${i + 1}`);
        });
        setDependentesPorPessoaLista(dependentesArrays);
      } catch (e) {
        console.warn('Falha ao carregar dados de edição (igualitária):', e);
        Alert.alert('Erro', 'Não foi possível carregar dados da divisão.');
      }
    })();
  }, [isEdit, editDivisionId]);

  async function handleSalvarAlteracoesIgual() {
    if (!isEdit || !editDivisionId) return;
    if (!camposValidos) {
      if (!validateAndScroll()) return;
    }
    try {
      setUploading(true);
      const t = totalValue;
      const taxa = taxa10 ? t * (taxaPercent / 100) : 0;
      const g = gorjetaOn ? gorjetaValue : 0;
      // Upload novo comprovante se selecionado localmente
      let compUrl: string | null = null;
      let compPath: string | null = null;
      if (comprovanteUri && !comprovanteUri.startsWith('http')) {
        const { data: userData } = await supabase.auth.getSession();
        if (userData.session?.user.id) {
          const up = await uploadComprovante(comprovanteUri, userData.session.user.id);
          compUrl = up.url;
          compPath = up.path;
        }
      }
      await updateDivisionBasic(editDivisionId, {
        local,
        data: dataISO || null,
        total: t,
        taxa,
        gorjeta: g,
        ...(compUrl || compPath ? { comprovante_url: compUrl, comprovante_path: compPath } : {}),
      });
      const participantesCount = Math.max(1, parseInt(qtdParticipantes || '0', 10));
      const participantesPayload = Array.from({ length: participantesCount }).map((_x, i) => ({
        nome: (nomes[i] || `Pessoa ${i + 1}`),
        dependentes: (dependentesPorPessoaLista[i]?.length || 0),
        user_id: participantUserIds[i] || null,
      }));
      const insertedCount = await applyDivisionParticipantsTransactional(editDivisionId, participantesPayload);

      // Telemetria sucesso
      await logEvent({
        screen: 'NovaDivisaoIgual',
        action: 'edit_save',
        divisionId: editDivisionId,
        success: true,
        payload: { participantesCount: participantesCount, insertedCount, taxaPercent: taxa10 ? taxaPercent : null, gorjetaOn, gorjetaValue },
      });

      Alert.alert('Divisão atualizada com sucesso!');
      setSnackMessage('Alterações salvas com sucesso');
      setSnackVisible(true);
      nav.navigate('DetalheDivisao', { divisionId: editDivisionId });
    } catch (e: any) {
      // Telemetria erro
      await logEvent({
        screen: 'NovaDivisaoIgual',
        action: 'edit_save',
        divisionId: editDivisionId,
        success: false,
        payload: { nomes, dependentesPorPessoaLista },
        error: e?.message || String(e),
      });
      Alert.alert('Erro ao salvar alterações', e.message ?? 'Tente novamente');
    } finally {
      setUploading(false);
    }
  }

  return (
    <ScrollView ref={scrollRef} style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '600', color: '#2F2F2F' }}>{isEdit ? 'Editar Divisão – Igualitária' : 'Nova Divisão – Igualitária'}</Text>

        <ImagePicker
          imageUri={comprovanteUri}
          onImageSelected={setComprovanteUri}
        />

        <TextInput
          placeholder="Local (ex.: Restaurante)"
          value={local}
          onChangeText={setLocal}
          onLayout={(e) => { fieldPositions.current['local'] = e.nativeEvent.layout.y; }}
          style={{ borderWidth: 1, borderColor: fieldErrors.local ? '#FF6B6B' : '#DDD', borderRadius: 8, padding: 12, marginTop: 12 }}
        />
        {fieldErrors.local && (
          <Text style={{ color: '#FF6B6B', marginTop: 4 }}>{fieldErrors.local}</Text>
        )}

        {/* Campo de data como touchable para abrir o calendário */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowDatePicker(true)}
          style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginTop: 12 }}
        >
          <Text style={{ color: '#2F2F2F' }}>{dataBR}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={new Date(dataISO)}
            mode="date"
            display={Platform.OS === 'ios' ? 'default' : 'default'}
            onChange={onDateChange}
          />
        )}

        <TextInput
          placeholder="Total (R$)"
          keyboardType="numeric"
          value={totalDisplay}
          onChangeText={handleTotalChange}
          onLayout={(e) => { fieldPositions.current['total'] = e.nativeEvent.layout.y; }}
          style={{ borderWidth: 1, borderColor: fieldErrors.total ? '#FF6B6B' : '#DDD', borderRadius: 8, padding: 12, marginTop: 12 }}
        />
        {fieldErrors.total && (
          <Text style={{ color: '#FF6B6B', marginTop: 4 }}>{fieldErrors.total}</Text>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
          <Switch value={taxa10} onValueChange={setTaxa10} />
          <Text style={{ marginLeft: 8, color: '#2F2F2F' }}>Taxa de serviço</Text>
        </View>
        {taxa10 && (
          <TextInput
            placeholder="Taxa (%)"
            keyboardType="numeric"
            value={taxaPercentStr}
            onChangeText={(txt) => {
              const digits = txt.replace(/\D/g, '');
              const val = parseInt(digits || '0', 10);
              setTaxaPercent(isNaN(val) ? 0 : Math.min(100, val));
              setTaxaPercentStr(digits);
            }}
            style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginTop: 12 }}
          />
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
          <Switch value={gorjetaOn} onValueChange={setGorjetaOn} />
          <Text style={{ marginLeft: 8, color: '#2F2F2F' }}>Gorjeta personalizada</Text>
        </View>
        {gorjetaOn && (
          <TextInput
            placeholder="Gorjeta (R$)"
            keyboardType="numeric"
            value={gorjetaDisplay}
            onChangeText={handleGorjetaChange}
            style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginTop: 12 }}
          />
        )}

        <View style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: '600', color: '#2F2F2F' }}>Participantes</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
          <TouchableOpacity
            onPress={() => {
              const n = Math.max(1, parseInt(qtdParticipantes || '0', 10) - 1);
              setQtdParticipantes(String(n));
              syncNomes(n);
              syncDependentes(n);
              syncUserIds(n);
            }}
            style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 }}
          >
            <Text style={{ fontSize: 18, color: '#2F2F2F' }}>−</Text>
          </TouchableOpacity>

          <TextInput
            placeholder="Qtd. participantes"
            keyboardType="number-pad"
            value={qtdParticipantes}
            onChangeText={(text) => {
              const digits = text.replace(/\D/g, '');
              const n = digits.length ? parseInt(digits, 10) : 0;
              const val = Math.max(1, n);
              setQtdParticipantes(String(val));
              syncNomes(val);
              syncDependentes(val);
              syncUserIds(val);
            }}
            onLayout={(e) => { fieldPositions.current['participantes'] = e.nativeEvent.layout.y; }}
            style={{ flex: 1, borderWidth: 1, borderColor: fieldErrors.participantes ? '#FF6B6B' : '#DDD', borderRadius: 8, padding: 12, marginHorizontal: 12, textAlign: 'center' }}
          />
          {fieldErrors.participantes && (
            <Text style={{ color: '#FF6B6B', marginTop: 4 }}>{fieldErrors.participantes}</Text>
          )}

          <TouchableOpacity
            onPress={() => {
              const n = Math.max(1, parseInt(qtdParticipantes || '0', 10) + 1);
              setQtdParticipantes(String(n));
              syncNomes(n);
              syncDependentes(n);
              syncUserIds(n);
            }}
            style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 }}
          >
            <Text style={{ fontSize: 18, color: '#2F2F2F' }}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Nomes sempre visíveis e dependentes por pessoa */}
        <View style={{ marginTop: 12 }}>
          {/* Seleção de amigos */}
          <View style={{ marginBottom: 8 }}>
            <TouchableOpacity
              onPress={async () => {
                const open = !friendsOpen;
                setFriendsOpen(open);
                if (open && friends.length === 0) await loadFriends();
              }}
              style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#F7F7F7' }}
            >
              <Text style={{ color: '#2F2F2F', fontWeight: '500' }}>{friendsOpen ? 'Ocultar amigos' : 'Adicionar dos amigos'}</Text>
            </TouchableOpacity>
            {friendsOpen && (
              <View style={{ marginTop: 8, borderWidth: 1, borderColor: '#EEE', borderRadius: 8, padding: 8 }}>
                {friendsLoading ? (
                  <ActivityIndicator />
                ) : friends.length === 0 ? (
                  <Text style={{ color: '#666' }}>Você ainda não tem amigos para adicionar.</Text>
                ) : (
                  <View>
                    {friends.map((f) => {
                      const nome = friendDisplay(f);
                      const jaAdicionado = nomes.includes(nome);
                      const marcado = selectedFriendIds.has(f.user_id);
                      return (
                        <TouchableOpacity key={f.user_id} onPress={() => toggleFriendSelected(f.user_id)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                          <Text style={{ width: 24, textAlign: 'center' }}>{marcado ? '✓' : '○'}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#2F2F2F', fontWeight: '500' }}>{nome}</Text>
                            {!!f.email && <Text style={{ color: '#666' }}>{f.email}</Text>}
                            {!!f.phone && <Text style={{ color: '#666' }}>{f.phone}</Text>}
                          </View>
                          {jaAdicionado && (
                            <Text style={{ color: '#2F2F2F' }}>já adicionado</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity
                      onPress={addSelectedFriends}
                      disabled={selectedFriendIds.size === 0}
                      style={{ marginTop: 8, backgroundColor: selectedFriendIds.size === 0 ? '#EEE' : '#2E7D32', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 }}
                    >
                      <Text style={{ color: selectedFriendIds.size === 0 ? '#2F2F2F' : '#FFF', fontWeight: '600' }}>Adicionar selecionados</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
          {Array.from({ length: Math.max(1, parseInt(qtdParticipantes || '0', 10)) }).map((_, idx) => (
            <View key={idx} style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  placeholder={`Nome do participante ${idx + 1}`}
                  value={nomes[idx] || ''}
                  onChangeText={(t) => {
                    setNomes((prev) => prev.map((p, i) => (i === idx ? t : p)));
                  }}
                  style={{ flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12 }}
                />
                <TouchableOpacity onPress={() => addDependente(idx)} style={{ marginLeft: 8, borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 }}>
                  <Text style={{ color: '#2F2F2F' }}>Add dependente</Text>
                </TouchableOpacity>
              </View>
              {(dependentesPorPessoaLista[idx] || []).map((dNome, dIdx) => (
                <View key={dIdx} style={{ marginTop: 6, marginLeft: 24 }}>
                  <TextInput
                    placeholder={`Dependente ${dIdx + 1}`}
                    value={dNome}
                    onChangeText={(t) => updateDependenteNome(idx, dIdx, t)}
                    style={{ borderWidth: 1, borderColor: '#EEE', borderRadius: 8, padding: 10 }}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Removido campo global de dependentes; agora dependentes são por pessoa */}

        <View style={{ marginTop: 16 }}>
          <Text style={{ color: '#2F2F2F' }}>
            Subtotal/Total calculado: R$ {totalBase.toFixed(2)}
          </Text>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: '600', color: '#2F2F2F' }}>Resumo por pessoa:</Text>
          {resultado.map((r) => (
            <Text key={r.pessoa} style={{ color: '#2F2F2F', marginTop: 4 }}>
              {r.pessoa}: R$ {r.valor.toFixed(2)} {r.dependentes > 0 ? `(com ${r.dependentes} dependentes)` : ''}
            </Text>
          ))}
        </View>

        <View style={{ marginTop: 20 }}>
          {uploading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : isEdit ? (
            <Button
              title="Salvar alterações"
              onPress={handleSalvarAlteracoesIgual}
            />
          ) : (
            <Button
              title="Criar Divisão"
              onPress={handleCriarDivisao}
            />
          )}
        </View>

        <Snackbar
          visible={snackVisible}
          message={snackMessage}
          onDismiss={() => setSnackVisible(false)}
        />

        {!isPro && (
          <Text style={{ marginTop: 16, color: '#666', textAlign: 'center' }}>
            Assine o plano Pro para adicionar comprovantes e dependentes.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
