import { supabase } from '../lib/supabaseClient';

export type TelemetryEvent = {
  screen: string;
  action: string;
  divisionId?: string;
  success: boolean;
  payload?: any;
  error?: string;
};

export async function logEvent(evt: TelemetryEvent) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return { ok: false };

  const { error } = await supabase
    .from('event_logs')
    .insert({
      user_id: userId,
      division_id: evt.divisionId ?? null,
      screen: evt.screen,
      action: evt.action,
      success: evt.success,
      payload: evt.payload ?? null,
      error: evt.error ?? null,
    });
  if (error) {
    console.warn('Falha ao registrar telemetria:', error.message);
    return { ok: false };
  }
  return { ok: true };
}

