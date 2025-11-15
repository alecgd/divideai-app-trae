import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { decode as decodeBase64 } from 'base64-arraybuffer';

function guessContentType(ext?: string, fallback?: string) {
  const e = (ext || '').toLowerCase();
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
  if (e === 'png') return 'image/png';
  if (e === 'webp') return 'image/webp';
  return fallback || 'application/octet-stream';
}

export async function uploadComprovante(uri: string, userId: string) {
  try {
    // Extrai extensão, se existir
    const rawExt = uri.split('.').pop();
    const ext = rawExt?.split('?')[0];
    let contentType = guessContentType(ext);

    // Define nome único do arquivo
    const filename = `${userId}/${Date.now()}.${ext || 'jpg'}`;

    // No web, busque a URI como Blob; no native, leia como base64
    let body: Blob | ArrayBuffer;
    if (Platform.OS === 'web') {
      const res = await fetch(uri);
      const blob = await res.blob();
      // Se conseguirmos um contentType do blob, use-o
      contentType = guessContentType(ext, blob.type || contentType);
      body = blob;
    } else {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const arrayBuffer = decodeBase64(base64);
      body = arrayBuffer;
    }

    // Upload para Supabase Storage
    const { data, error } = await supabase.storage
      .from('comprovantes')
      .upload(filename, body as any, { contentType });

    if (error) throw error;

    // URL pública
    const { data: pub } = supabase.storage
      .from('comprovantes')
      .getPublicUrl(filename);

    return {
      url: pub.publicUrl,
      path: filename,
    };
  } catch (e) {
    console.error('Erro no upload:', e);
    throw new Error('Falha ao fazer upload do comprovante');
  }
}

export async function getSignedComprovanteUrl(path: string, expiresInSeconds: number = 3600) {
  try {
    const { data, error } = await supabase.storage
      .from('comprovantes')
      .createSignedUrl(path, expiresInSeconds);
    if (error) throw error;
    return data?.signedUrl || null;
  } catch (e) {
    console.error('Erro ao gerar URL assinada do comprovante:', e);
    return null;
  }
}
