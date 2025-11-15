import { supabase } from '../lib/supabaseClient';

export type Profile = {
  user_id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type FriendRequest = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
};

export type Friendship = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  created_at: string;
};

export async function getCurrentUserId(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData.session?.user.id ?? null;
}

export async function listFriends(): Promise<{ friends: Profile[] }> {
  const userId = await getCurrentUserId();
  if (!userId) return { friends: [] };

  const { data, error } = await supabase
    .from('friends')
    .select('*')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);
  if (error) throw error;
  const rows = (data || []) as Friendship[];
  const friendIds = rows.map((r) => (r.user_a_id === userId ? r.user_b_id : r.user_a_id));
  if (!friendIds.length) return { friends: [] };
  const { data: profs, error: pErr } = await supabase
    .from('profiles')
    .select('user_id,name,email')
    .in('user_id', friendIds);
  if (pErr) throw pErr;
  return { friends: (profs || []) as Profile[] };
}

export async function listIncomingRequests(): Promise<FriendRequest[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as FriendRequest[];
}

export async function listOutgoingRequests(): Promise<FriendRequest[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('from_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as FriendRequest[];
}

export async function searchProfiles(query: string, limit: number = 20): Promise<Profile[]> {
  const qRaw = (query || '').trim();
  if (!qRaw) return [];

  // Heurística: se contém '@' busca por email; se tem dígitos suficientes, busca por telefone; senão, nome.
  const isEmail = qRaw.includes('@');
  const digits = qRaw.replace(/\D/g, '');
  const isPhone = !isEmail && digits.length >= 8; // DDD+NUMERO

  if (isEmail) {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id,name,email,phone')
      .ilike('email', `%${qRaw}%`)
      .limit(limit);
    if (error) throw error;
    return (data || []) as Profile[];
  }

  if (isPhone) {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id,name,email,phone')
      .ilike('phone', `%${digits}%`)
      .limit(limit);
    if (error) throw error;
    return (data || []) as Profile[];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id,name,email,phone')
    .ilike('name', `%${qRaw}%`)
    .limit(limit);
  if (error) throw error;
  return (data || []) as Profile[];
}

export async function sendFriendRequest(toUserId: string): Promise<FriendRequest> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Sessão inválida');
  if (!toUserId || toUserId === userId) throw new Error('Destinatário inválido');

  // Prevent duplicate pending requests or existing friendship
  const { data: existingReq } = await supabase
    .from('friend_requests')
    .select('id')
    .or(`and(from_user_id.eq.${userId},to_user_id.eq.${toUserId},status.eq.pending),and(from_user_id.eq.${toUserId},to_user_id.eq.${userId},status.eq.pending)`)
    .limit(1);
  if (existingReq && existingReq.length) throw new Error('Já existe um pedido pendente');

  const { data: existingFriend } = await supabase
    .from('friends')
    .select('id')
    .or(`and(user_a_id.eq.${userId},user_b_id.eq.${toUserId}),and(user_a_id.eq.${toUserId},user_b_id.eq.${userId})`)
    .limit(1);
  if (existingFriend && existingFriend.length) throw new Error('Vocês já são amigos');

  const { data, error } = await supabase
    .from('friend_requests')
    .insert({ from_user_id: userId, to_user_id: toUserId, status: 'pending' })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as FriendRequest;
}

export async function acceptRequest(requestId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Sessão inválida');
  // Update status
  const { data: req, error: uErr } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .select()
    .maybeSingle();
  if (uErr) throw uErr;
  if (!req) throw new Error('Pedido não encontrado');

  const otherId = (req.from_user_id === userId) ? req.to_user_id : req.from_user_id;
  // Insert friendship (undirected pair); current user is one of the ends
  const { error: fErr } = await supabase
    .from('friends')
    .insert({ user_a_id: userId, user_b_id: otherId });
  if (fErr) throw fErr;
}

export async function declineRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'declined' })
    .eq('id', requestId);
  if (error) throw error;
}

export async function removeFriend(friendUserId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Sessão inválida');
  const { error } = await supabase
    .from('friends')
    .delete()
    .or(`and(user_a_id.eq.${userId},user_b_id.eq.${friendUserId}),and(user_a_id.eq.${friendUserId},user_b_id.eq.${userId})`);
  if (error) throw error;
}
