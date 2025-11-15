import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, TextInput, Switch, Button, Alert, ScrollView, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useUserPlan } from '../hooks/useUserPlan';
import { useNavigation, useRoute } from '@react-navigation/native';
import ImagePicker from '../components/ImagePicker';
import Snackbar from '../components/Snackbar';
import { uploadComprovante, getSignedComprovanteUrl } from '../services/storage';
import { supabase } from '../lib/supabaseClient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createDivisionItems, insertDivisionItems, insertDivisionParticipants, getDivisionById, getDivisionItems, getDivisionParticipants, getDivisionItemConsumersByItemIds, updateDivisionBasic, deleteDivisionItems, deleteDivisionItemConsumersByItemIds, applyDivisionParticipantsTransactional } from '../services/divisions';
import { logEvent } from '../services/telemetry';
import { listFriends, type Profile } from '../services/friends';

export default function NewDivisionItemsScreen() {
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

  const formatBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // Itens
  type Item = { nome: string; priceValue: number; priceDisplay: string; qtd: number };
  const [itens, setItens] = useState<Item[]>([]);
  type ItemError = { nome?: string; preco?: string; qtd?: string };
  const [itemErrors, setItemErrors] = useState<ItemError[]>([]);
  const itemPositions = useRef<Record<number, number>>({});
  const scrollRef = useRef<ScrollView>(null);
  const addItem = () => {
    setItens((prev) => [...prev, { nome: '', priceValue: 0, priceDisplay: '', qtd: 1 }]);
    setItemErrors((prev) => [...prev, {}]);
  };
  const removeItem = (idx: number) => {
    setItens((prev) => prev.filter((_, i) => i !== idx));
    setItemErrors((prev) => prev.filter((_, i) => i !== idx));
  };
  const updateItemName = (idx: number, nome: string) => {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, nome } : it)));
    setItemErrors((prev) => prev.map((err, i) => (i === idx ? { ...err, nome: undefined } : err)));
  };
  const updateItemPrice = (idx: number, text: string) => {
    const digits = text.replace(/\D/g, '');
    const value = (parseInt(digits || '0', 10)) / 100;
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, priceValue: value, priceDisplay: value > 0 ? formatBRL(value) : '' } : it)));
    setItemErrors((prev) => prev.map((err, i) => (i === idx ? { ...err, preco: undefined } : err)));
  };
  const incQtd = (idx: number) => {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, qtd: it.qtd + 1 } : it)));
    setItemErrors((prev) => prev.map((err, i) => (i === idx ? { ...err, qtd: undefined } : err)));
  };
  const decQtd = (idx: number) => {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, qtd: Math.max(1, it.qtd - 1) } : it)));
    setItemErrors((prev) => prev.map((err, i) => (i === idx ? { ...err, qtd: undefined } : err)));
  };

  // Participantes
  const [qtdParticipantes, setQtdParticipantes] = useState<string>('2');
  const [nomes, setNomes] = useState<string[]>(['Pessoa 1', 'Pessoa 2']);
  // Dependentes por pessoa (lista de nomes por participante). Persistiremos apenas a contagem.
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
      const novoNome = `Dependente ${atual.length + 1}`;
      next[pIdx] = [...atual, novoNome];
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
      Alert.alert('Erro', e?.message || 'Erro ao carregar amigos');
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
        Alert.alert('Aviso', 'Participante já adicionado');
        return prev;
      }
      const current = Math.max(0, parseInt(qtdParticipantes || '0', 10));
      const novoTotal = current + 1;
      setQtdParticipantes(String(novoTotal));
      const next = [...prev, nome];
      while (next.length < novoTotal) next.push(`Pessoa ${next.length + 1}`);
      if (next.length > novoTotal) next.length = novoTotal;
      syncDependentes(novoTotal);
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
    Alert.alert('Sucesso', 'Amigos adicionados');
  };
  useEffect(() => {
    const n = Math.max(1, parseInt(qtdParticipantes || '0', 10));
    syncUserIds(n);
  }, [qtdParticipantes]);

  // Taxa e Gorjeta
  const [taxa10, setTaxa10] = useState<boolean>(false);
  const [taxaPercent, setTaxaPercent] = useState<number>(10);
  const [taxaPercentStr, setTaxaPercentStr] = useState<string>('10');
  const [gorjetaOn, setGorjetaOn] = useState<boolean>(false);
  const [gorjetaValue, setGorjetaValue] = useState<number>(0);
  const [gorjetaDisplay, setGorjetaDisplay] = useState<string>('');
  const handleGorjetaChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    const value = (parseInt(digits || '0', 10)) / 100;
    setGorjetaValue(value);
    setGorjetaDisplay(value > 0 ? formatBRL(value) : '');
  };

  // Associação de consumo por item: mapa itemIndex -> mapa participantIndex -> marcou consumo (SIM/NÃO)
  const [consumoPorItem, setConsumoPorItem] = useState<Record<number, Record<number, boolean>>>({});
  const toggleConsumo = (itemIdx: number, participantIdx: number) => {
    setConsumoPorItem((prev) => ({
      ...prev,
      [itemIdx]: {
        ...(prev[itemIdx] || {}),
        [participantIdx]: !(prev[itemIdx]?.[participantIdx] || false),
      },
    }));
  };

  const subtotalItens = useMemo(() => itens.reduce((sum, it) => sum + it.priceValue * it.qtd, 0), [itens]);
  const totalBase = useMemo(() => {
    const t = subtotalItens;
    const taxa = taxa10 ? t * (taxaPercent / 100) : 0;
    const g = gorjetaOn ? gorjetaValue : 0;
    return t + taxa + g;
  }, [subtotalItens, taxa10, taxaPercent, gorjetaOn, gorjetaValue]);

  const resultado = useMemo(() => {
    const participantes = parseInt(qtdParticipantes || '0', 10);
    if (participantes <= 0 || totalBase <= 0) return [];

    // Pesos por pessoa = 1 + número de dependentes
    const pesos = Array.from({ length: participantes }).map((_, idx) => 1 + (dependentesPorPessoaLista[idx]?.length || 0));
    const somaPesos = pesos.reduce((a, b) => a + b, 0) || 1;

    // Acumulador de valores por pessoa
    const valoresPorPessoa = Array.from({ length: participantes }).map(() => 0);

    // Distribuição dos itens
    itens.forEach((it, itemIdx) => {
      const totalItem = it.priceValue * it.qtd;
      const consumoMapa = consumoPorItem[itemIdx] || {};
      const consumidores = Object.keys(consumoMapa)
        .filter((k) => consumoMapa[parseInt(k, 10)])
        .map((k) => parseInt(k, 10));

      if (consumidores.length > 0) {
        const parcela = totalItem / consumidores.length;
        consumidores.forEach((pIdx) => {
          if (pIdx >= 0 && pIdx < participantes) {
            valoresPorPessoa[pIdx] += parcela;
          }
        });
      } else {
        // Sem consumidores marcados: distribui por peso
        pesos.forEach((peso, pIdx) => {
          const frac = peso / somaPesos;
          valoresPorPessoa[pIdx] += totalItem * frac;
        });
      }
    });

    // Extras (taxa + gorjeta) distribuídos por peso
    const extras = totalBase - subtotalItens;
    if (extras > 0) {
      pesos.forEach((peso, pIdx) => {
        const frac = peso / somaPesos;
        valoresPorPessoa[pIdx] += extras * frac;
      });
    }

    return valoresPorPessoa.map((valor, idx) => ({
      pessoa: (nomes[idx] || `Pessoa ${idx + 1}`),
      valor: +valor.toFixed(2),
    }));
  }, [qtdParticipantes, totalBase, nomes, itens, consumoPorItem, dependentesPorPessoaLista, subtotalItens]);

  const camposValidos = local.trim().length > 0 && parseInt(qtdParticipantes || '0', 10) > 0;

  const nav = useNavigation<any>();
  const [comprovanteUri, setComprovanteUri] = useState<string>();
  const [snackVisible, setSnackVisible] = useState<boolean>(false);
  const [snackMessage, setSnackMessage] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const onDateChange = (event: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) {
      const y = selected.getFullYear();
      const m = pad(selected.getMonth() + 1);
      const d = pad(selected.getDate());
      setDataISO(`${y}-${m}-${d}`);
      setDataBR(`${d}/${m}/${y}`);
    }
  };

  function validateItemsAndScroll(): boolean {
    const errors: ItemError[] = itens.map((it) => ({
      nome: it.nome.trim().length === 0 ? 'Informe o nome do item' : undefined,
      preco: !(it.priceValue > 0) ? 'Preço deve ser maior que zero' : undefined,
      qtd: !(it.qtd > 0) ? 'Quantidade deve ser maior que zero' : undefined,
    }));
    const firstIdx = errors.findIndex((e) => e.nome || e.preco || e.qtd);
    setItemErrors(errors);
    if (firstIdx >= 0) {
      const y = itemPositions.current[firstIdx] ?? 0;
      // Ajuste pequeno para posicionar o erro no topo visível
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
      setSnackMessage('Corrija os campos destacados.');
      setSnackVisible(true);
      return false;
    }
    return true;
  }

  async function handleCriarDivisao() {
    if (!camposValidos) {
      // Validar campos principais
      const topErrs: string[] = [];
      if (local.trim().length === 0) topErrs.push('local');
      if (!(parseInt(qtdParticipantes || '0', 10) > 0)) topErrs.push('participantes');
      if (topErrs.length) {
        setSnackMessage('Corrija os campos destacados.');
        setSnackVisible(true);
        return;
      }
    }
    // Validação de itens com feedback visual e rolagem
    if (!validateItemsAndScroll()) return;
    try {
      setUploading(true);

      // Upload do comprovante se houver
      let comprovanteUrl: string | undefined, comprovantePath: string | undefined;
      if (comprovanteUri) {
        const { data: userData } = await supabase.auth.getSession();
        if (userData.session?.user.id) {
          const upload = await uploadComprovante(comprovanteUri, userData.session.user.id);
          comprovanteUrl = upload.url;
          comprovantePath = upload.path;
        }
      }

      const created = await createDivisionItems({
        tipo: 'itens',
        local,
        data: dataISO || undefined,
        total: subtotalItens,
        taxa: taxa10 ? subtotalItens * (taxaPercent / 100) : 0,
        gorjeta: gorjetaOn ? gorjetaValue : 0,
        comprovante_url: comprovanteUrl,
        comprovante_path: comprovantePath,
      });

      // Consumo por item agora é marcado por participante (SIM/NÃO), sem validação de soma de quantidades.

      // Persiste itens individuais
      let insertedItems: { id: string; nome: string; preco: number; quantidade: number }[] = [];
      if (created?.id) {
        const itensValidos = itens
          .filter((it) => it.nome.trim().length > 0 && it.priceValue > 0 && it.qtd > 0)
          .map((it) => ({ nome: it.nome.trim(), preco: it.priceValue, quantidade: it.qtd }));
        try {
          insertedItems = await insertDivisionItems(created.id, itensValidos) as any;
        } catch (e) {
          console.warn('Falha ao salvar itens:', e);
          Alert.alert('Aviso', 'Divisão criada, mas houve erro ao salvar os itens.');
        }

        // Persiste participantes (opcionalmente com nomes)
        const participantesCount = Math.max(1, parseInt(qtdParticipantes || '0', 10));
        const participantesPayload = Array.from({ length: participantesCount }).map((_x, i) => ({
          nome: (nomes[i] || `Pessoa ${i + 1}`),
          dependentes: (dependentesPorPessoaLista[i]?.length || 0),
          user_id: participantUserIds[i] || null,
        }));
        let insertedParticipants: { id: string; nome: string; dependentes: number }[] = [];
        try {
          insertedParticipants = await insertDivisionParticipants(created.id, participantesPayload) as any;
        } catch (e) {
          console.warn('Falha ao salvar participantes:', e);
          Alert.alert('Aviso', 'Divisão criada, mas houve erro ao salvar participantes.');
        }

        // Persiste associações de consumo por item (checkbox SIM/NÃO)
        try {
          const { insertDivisionItemConsumers } = await import('../services/divisions');
          for (let i = 0; i < insertedItems.length; i++) {
            const assoc = consumoPorItem[i];
            if (!assoc) continue;
            const consumersPayload = Object.entries(assoc)
              .filter(([_pIdxStr, marcado]) => !!marcado)
              .map(([pIdxStr]) => {
                const pIdx = parseInt(pIdxStr, 10);
                const participant = insertedParticipants[pIdx];
                return participant ? { participant_id: participant.id, quantidade: 1 } : null;
              })
              .filter(Boolean) as { participant_id: string; quantidade: number }[];
            if (consumersPayload.length) {
              await insertDivisionItemConsumers(insertedItems[i].id, consumersPayload);
            }
          }
        } catch (e) {
          console.warn('Falha ao salvar consumo por item:', e);
          Alert.alert('Aviso', 'Divisão criada, mas houve erro ao salvar o consumo por item.');
        }
      }

      Alert.alert('Divisão por itens criada!', `ID: ${created?.id}`);
      nav.navigate('Tabs', { screen: 'Histórico' });
    } catch (e: any) {
      Alert.alert('Erro ao criar divisão', e.message ?? 'Tente novamente');
    } finally {
      setUploading(false);
    }
  }

  // Carregar dados para edição
  useEffect(() => {
    if (!isEdit || !editDivisionId) return;
    (async () => {
      try {
        setUploading(true);
        const division = await getDivisionById(editDivisionId);
        if (division) {
          setLocal(division.local || '');
          const dataStr: string | undefined = division.data || undefined;
          if (dataStr) {
            setDataISO(dataStr);
            const [y, m, d] = dataStr.split('-');
            setDataBR(`${d}/${m}/${y}`);
          }
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
          // Guardar taxa para cálculo percentual após carregar itens
          var taxaLoadedAmount = taxaNum;
        }

        // Participantes
        const parts = await getDivisionParticipants(editDivisionId);
        const nomesCarregados = parts.map((p, i) => p.nome || `Pessoa ${i + 1}`);
        setQtdParticipantes(String(Math.max(1, parts.length)));
        setNomes(nomesCarregados);
        setParticipantUserIds(parts.map((p: any) => p.user_id || null));
        const dependentesArrays = parts.map((p) => {
          const count = p.dependentes || 0;
          return Array.from({ length: count }).map((_x, i) => `Dependente ${i + 1}`);
        });
        setDependentesPorPessoaLista(dependentesArrays);

        const participantIdToIndex: Record<string, number> = {};
        parts.forEach((p, idx) => { if (p.id) participantIdToIndex[p.id] = idx; });

        // Itens e consumidores
        const items = await getDivisionItems(editDivisionId);
        const itensFmt = items.map((it) => ({ nome: it.nome, priceValue: it.preco, priceDisplay: it.preco > 0 ? formatBRL(it.preco) : '', qtd: it.quantidade }));
        setItens(itensFmt);
        // Inicializa taxaPercent com base no subtotal dos itens carregados
        try {
          const base = items.reduce((sum, it) => sum + (it.preco || 0) * (it.quantidade || 1), 0);
          if (typeof taxaLoadedAmount === 'number' && taxaLoadedAmount > 0 && base > 0) {
            const pct = Math.round((taxaLoadedAmount / base) * 100);
            setTaxaPercent(pct);
            setTaxaPercentStr(String(pct));
            setTaxa10(true);
          }
        } catch {}
        const itemIds = items.map((it) => it.id!).filter(Boolean) as string[];
        if (itemIds.length) {
          const consumers = await getDivisionItemConsumersByItemIds(itemIds);
          const consumoMap: Record<number, Record<number, boolean>> = {};
          consumers.forEach((c) => {
            const itemIndex = items.findIndex((it) => it.id === c.division_item_id);
            const pIdx = participantIdToIndex[c.participant_id];
            if (itemIndex >= 0 && pIdx >= 0) {
              consumoMap[itemIndex] = consumoMap[itemIndex] || {};
              consumoMap[itemIndex][pIdx] = true;
            }
          });
          setConsumoPorItem(consumoMap);
        }
      } catch (e) {
        console.warn('Falha ao carregar dados para edição:', e);
        Alert.alert('Erro', 'Não foi possível carregar dados da divisão.');
      } finally {
        setUploading(false);
      }
    })();
  }, [isEdit, editDivisionId]);

  async function handleSalvarAlteracoes() {
    if (!isEdit || !editDivisionId) return;
    if (!camposValidos) {
      setSnackMessage('Corrija os campos destacados.');
      setSnackVisible(true);
      return;
    }
    // Validação de itens com feedback visual e rolagem
    if (!validateItemsAndScroll()) return;
    try {
      setUploading(true);
      const taxa = taxa10 ? subtotalItens * (taxaPercent / 100) : 0;
      const g = gorjetaOn ? gorjetaValue : 0;
      // Upload de novo comprovante se selecionado (URI local)
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
        total: subtotalItens,
        taxa,
        gorjeta: g,
        ...(compUrl || compPath ? { comprovante_url: compUrl, comprovante_path: compPath } : {}),
      });

      // Substituir participantes de forma transacional
      const participantesCount = Math.max(1, parseInt(qtdParticipantes || '0', 10));
      const participantesPayload = Array.from({ length: participantesCount }).map((_x, i) => ({
        nome: (nomes[i] || `Pessoa ${i + 1}`),
        dependentes: (dependentesPorPessoaLista[i]?.length || 0),
        user_id: participantUserIds[i] || null,
      }));
      const insertedCount = await applyDivisionParticipantsTransactional(editDivisionId, participantesPayload);
      // Precisamos dos IDs para associar consumo por item; recarrega participantes
      const insertedParticipants = await getDivisionParticipants(editDivisionId);

      // Substituir itens e consumidores
      const oldItems = await getDivisionItems(editDivisionId);
      const oldItemIds = oldItems.map((it) => it.id!).filter(Boolean) as string[];
      if (oldItemIds.length) {
        await deleteDivisionItemConsumersByItemIds(oldItemIds);
      }
      await deleteDivisionItems(editDivisionId);

      const itensValidos = itens
        .filter((it) => it.nome.trim().length > 0 && it.priceValue > 0 && it.qtd > 0)
        .map((it) => ({ nome: it.nome.trim(), preco: it.priceValue, quantidade: it.qtd }));
      const insertedItems = await insertDivisionItems(editDivisionId, itensValidos) as any;

      // Inserir consumidores conforme switches
      const participantIndexToId: string[] = insertedParticipants.map((p: any) => p.id);
      for (let i = 0; i < insertedItems.length; i++) {
        const assoc = consumoPorItem[i];
        if (!assoc) continue;
        const consumersPayload = Object.entries(assoc)
          .filter(([_pIdxStr, marcado]) => !!marcado)
          .map(([pIdxStr]) => {
            const pIdx = parseInt(pIdxStr, 10);
            const participantId = participantIndexToId[pIdx];
            return participantId ? { participant_id: participantId, quantidade: 1 } : null;
          })
          .filter(Boolean) as { participant_id: string; quantidade: number }[];
        if (consumersPayload.length) {
          const { insertDivisionItemConsumers } = await import('../services/divisions');
          await insertDivisionItemConsumers(insertedItems[i].id, consumersPayload);
        }
      }

      // Telemetria sucesso
      await logEvent({
        screen: 'NovaDivisaoItens',
        action: 'edit_save',
        divisionId: editDivisionId,
        success: true,
        payload: { participantesCount, insertedCount, itensCount: itens.length, taxaPercent: taxa10 ? taxaPercent : null, gorjetaOn, gorjetaValue },
      });
      Alert.alert('Divisão atualizada com sucesso!');
      setSnackMessage('Alterações salvas com sucesso');
      setSnackVisible(true);
      nav.navigate('DetalheDivisao', { divisionId: editDivisionId });
    } catch (e: any) {
      // Telemetria erro
      await logEvent({
        screen: 'NovaDivisaoItens',
        action: 'edit_save',
        divisionId: editDivisionId,
        success: false,
        payload: { nomes, dependentesPorPessoaLista, itens },
        error: e?.message || String(e),
      });
      Alert.alert('Erro ao salvar alterações', e.message ?? 'Tente novamente');
    } finally {
      setUploading(false);
    }
  }

  // Carregar imagem de comprovante existente com URL assinada no modo edição
  useEffect(() => {
    (async () => {
      if (!isEdit) return;
      try {
        const division = await getDivisionById(editDivisionId!);
        const path = division?.comprovante_path as string | undefined;
        const url = division?.comprovante_url as string | undefined;
        if (path) {
          const signed = await getSignedComprovanteUrl(path);
          if (signed) setComprovanteUri(signed);
        } else if (url) {
          setComprovanteUri(url);
        }
        // Inicializar taxaPercent a partir do valor de taxa gravado
        const taxaAmount: number = Number(division?.taxa || 0);
        const base = subtotalItens;
        if (taxaAmount > 0 && base > 0) {
          const pct = Math.round((taxaAmount / base) * 100);
          setTaxaPercent(pct);
          setTaxaPercentStr(String(pct));
          setTaxa10(true);
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  return (
    <ScrollView ref={scrollRef} style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '600', color: '#2F2F2F' }}>{isEdit ? 'Editar Divisão – Por Itens' : 'Nova Divisão – Por Itens'}</Text>

        <ImagePicker imageUri={comprovanteUri} onImageSelected={setComprovanteUri} />

        <TextInput
          placeholder="Local (ex.: Mercado)"
          value={local}
          onChangeText={setLocal}
          style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginTop: 12 }}
        />

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

        {/* Participantes (movido antes dos itens) */}
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
+              syncDependentes(val);
            }}
            style={{ flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginHorizontal: 12, textAlign: 'center' }}
          />

          <TouchableOpacity
            onPress={() => {
              const n = Math.max(1, parseInt(qtdParticipantes || '0', 10) + 1);
              setQtdParticipantes(String(n));
              syncNomes(n);
              syncDependentes(n);
            }}
            style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 }}
          >
            <Text style={{ fontSize: 18, color: '#2F2F2F' }}>+</Text>
          </TouchableOpacity>
        </View>


        {/* Nomes dos participantes sempre visíveis + amigos */}
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
                  <>
                    {friends.map((f) => {
                      const nome = friendDisplay(f);
                      const jaAdicionado = nomes.includes(nome);
                      const selected = selectedFriendIds.has(f.user_id);
                      return (
                        <View key={f.user_id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                          <TouchableOpacity onPress={() => toggleFriendSelected(f.user_id)} style={{ width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: '#DDD', alignItems: 'center', justifyContent: 'center', marginRight: 8, backgroundColor: selected ? '#FF6B6B' : '#FFF' }}>
                            <Text style={{ color: selected ? '#FFF' : '#666' }}>{selected ? '✓' : ''}</Text>
                          </TouchableOpacity>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#2F2F2F', fontWeight: '500' }}>{nome}</Text>
                            {!!f.email && <Text style={{ color: '#666' }}>{f.email}</Text>}
                            {!!f.phone && <Text style={{ color: '#666' }}>{f.phone}</Text>}
                          </View>
                          <TouchableOpacity
                            disabled={jaAdicionado}
                            onPress={() => addFriendAsParticipant(f)}
                            style={{ backgroundColor: jaAdicionado ? '#EEE' : '#FF6B6B', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}
                          >
                            <Text style={{ color: jaAdicionado ? '#2F2F2F' : '#FFF', fontWeight: '600' }}>{jaAdicionado ? 'JÁ ADICIONADO' : 'ADICIONAR'}</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                    <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
                      <TouchableOpacity onPress={addSelectedFriends} style={{ backgroundColor: '#2F9F3D', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
                        <Text style={{ color: '#FFF', fontWeight: '600' }}>Adicionar selecionados</Text>
                      </TouchableOpacity>
                    </View>
                  </>
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
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '600', color: '#2F2F2F' }}>Itens</Text>
            <Button title="Adicionar item" onPress={addItem} />
          </View>

          {itens.map((it, idx) => (
            <View
              key={idx}
              style={{ borderWidth: 1, borderColor: '#EEE', borderRadius: 8, padding: 12, marginTop: 12 }}
              onLayout={(e) => { itemPositions.current[idx] = e.nativeEvent.layout.y; }}
            >
              <TextInput
                placeholder="Nome do item"
                value={it.nome}
                onChangeText={(t) => updateItemName(idx, t)}
                style={{ borderWidth: 1, borderColor: itemErrors[idx]?.nome ? '#FF6B6B' : '#DDD', borderRadius: 8, padding: 10 }}
              />
              {itemErrors[idx]?.nome && (
                <Text style={{ color: '#FF6B6B', marginTop: 4 }}>{itemErrors[idx]?.nome}</Text>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <TextInput
                  placeholder="Preço (R$)"
                  keyboardType="numeric"
                  value={it.priceDisplay}
                  onChangeText={(t) => updateItemPrice(idx, t)}
                  style={{ flex: 1, borderWidth: 1, borderColor: itemErrors[idx]?.preco ? '#FF6B6B' : '#DDD', borderRadius: 8, padding: 10 }}
                />

                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
                  <TouchableOpacity onPress={() => decQtd(idx)} style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 }}>
                    <Text style={{ fontSize: 18, color: '#2F2F2F' }}>−</Text>
                  </TouchableOpacity>
                  <Text style={{ width: 40, textAlign: 'center' }}>{it.qtd}</Text>
                  <TouchableOpacity onPress={() => incQtd(idx)} style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 }}>
                    <Text style={{ fontSize: 18, color: '#2F2F2F' }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {(itemErrors[idx]?.preco || itemErrors[idx]?.qtd) && (
                <View style={{ marginTop: 4 }}>
                  {itemErrors[idx]?.preco && (
                    <Text style={{ color: '#FF6B6B' }}>{itemErrors[idx]?.preco}</Text>
                  )}
                  {itemErrors[idx]?.qtd && (
                    <Text style={{ color: '#FF6B6B' }}>{itemErrors[idx]?.qtd}</Text>
                  )}
                </View>
              )}

              {/* Associação de consumo por participante - checkbox SIM/NÃO */}
              <View style={{ marginTop: 12 }}>
                 <Text style={{ fontWeight: '500', color: '#2F2F2F' }}>Quem consumiu este item?</Text>
                 {Array.from({ length: Math.max(1, parseInt(qtdParticipantes || '0', 10)) }).map((_, pIdx) => (
                   <View key={pIdx} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                     <Text style={{ flex: 1, color: '#2F2F2F' }}>{nomes[pIdx] || `Pessoa ${pIdx + 1}`}</Text>
                     <Switch
                       value={!!(consumoPorItem[idx]?.[pIdx])}
                       onValueChange={() => toggleConsumo(idx, pIdx)}
                     />
                   </View>
                 ))}
               </View>

              <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#2F2F2F' }}>Subtotal item:</Text>
                <Text style={{ color: '#2F2F2F', fontWeight: '600' }}>{formatBRL(it.priceValue * it.qtd)}</Text>
              </View>

              <View style={{ marginTop: 8 }}>
                <Button title="Remover" color="#FF6B6B" onPress={() => removeItem(idx)} />
              </View>
            </View>
          ))}
        </View>

        {/* Controles de Taxa/Gorjeta */}
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
          <Text style={{ color: '#2F2F2F' }}>Subtotal itens: {formatBRL(subtotalItens)}</Text>
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={{ color: '#2F2F2F' }}>Total com taxas/gorjeta: {formatBRL(totalBase)}</Text>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: '600', color: '#2F2F2F' }}>Resumo por pessoa:</Text>
          {resultado.map((r) => (
            <Text key={r.pessoa} style={{ color: '#2F2F2F', marginTop: 4 }}>
              {r.pessoa}: R$ {r.valor.toFixed(2)}
            </Text>
          ))}
        </View>

        <Snackbar
          visible={snackVisible}
          message={snackMessage}
          onDismiss={() => setSnackVisible(false)}
        />

        <View style={{ marginTop: 20 }}>
          {uploading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : isEdit ? (
            <Button title="Salvar alterações" onPress={handleSalvarAlteracoes} />
          ) : (
            <Button title="Criar Divisão" onPress={handleCriarDivisao} />
          )}
        </View>

        {!isPro && (
          <Text style={{ marginTop: 16, color: '#666', textAlign: 'center' }}>
            Assine o plano Pro para adicionar comprovantes.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
