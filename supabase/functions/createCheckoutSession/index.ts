// Deno + NPM compat
import Stripe from 'npm:stripe';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const STRIPE_PRICE_ID = Deno.env.get('STRIPE_PRICE_ID')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

// Handler único com saneamento e validação
Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await authClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const mode: 'subscription' | 'payment' = body?.mode === 'payment' ? 'payment' : 'subscription';

    // Sanitização reforçada: remove espaços/crases/aspas no início/fim e também quaisquer crases/aspas remanescentes
    const sanitize = (s?: string) =>
      (s ?? '')
        .trim()
        .replace(/^[\s`'"]+|[\s`'"]+$/g, '')
        .replace(/[`'"]/g, '');

    const RAW_SUCCESS = Deno.env.get('APP_SUCCESS_URL');
    const RAW_CANCEL = Deno.env.get('APP_CANCEL_URL');
    const APP_SUCCESS_URL = sanitize(RAW_SUCCESS);
    const APP_CANCEL_URL = sanitize(RAW_CANCEL);

    try {
      new URL(APP_SUCCESS_URL);
      new URL(APP_CANCEL_URL);
    } catch {
      return new Response(
        JSON.stringify({
          error: 'APP_SUCCESS_URL ou APP_CANCEL_URL inválida(s)',
          APP_SUCCESS_URL,
          APP_CANCEL_URL,
        }),
        { status: 400 }
      );
    }

    console.log('Criando sessão com:', {
      mode,
      success_url: APP_SUCCESS_URL,
      cancel_url: APP_CANCEL_URL,
      price_id: STRIPE_PRICE_ID,
      user_id: user.id,
      email: user.email
    });

    const session = await stripe.checkout.sessions.create({
      mode,
      success_url: 'https://alecgd.github.io/divideai-app-trae/success.html',
      cancel_url: 'https://alecgd.github.io/divideai-app-trae/cancel.html',
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata: { user_id: user.id },
      ui_mode: 'hosted',
      payment_method_types: ['card'],
    }).catch(error => {
      console.error('Erro ao criar sessão:', error);
      throw error;
    });

    console.log('Sessão criada:', {
      id: session.id,
      url: session.url,
      status: session.status
    });

    // Remove todas as crases e espaços da URL
    const cleanSessionUrl = (session.url ?? '').replace(/[`\s]/g, '');

    // Sobrescreve campos do objeto session para evitar ambiguidade nos logs do app
    const sessionCleaned = {
      ...session,
      url: cleanSessionUrl,
      success_url: APP_SUCCESS_URL,
      cancel_url: APP_CANCEL_URL,
    };

    return new Response(
      JSON.stringify({
        url: cleanSessionUrl,
        sessionId: session.id,
        effectiveSuccessUrl: APP_SUCCESS_URL,
        effectiveCancelUrl: APP_CANCEL_URL,
        session: sessionCleaned,
      }),
      { status: 200 }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
});