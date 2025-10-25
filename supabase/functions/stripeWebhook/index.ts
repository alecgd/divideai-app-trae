import Stripe from 'npm:stripe';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    const sig = req.headers.get('stripe-signature');
    if (!sig) {
      return new Response('Missing signature', { status: 400 });
    }
    const payload = await req.text();
    const event = stripe.webhooks.constructEvent(payload, sig, STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = (session.metadata?.user_id as string) || (session.client_reference_id as string);

      let planoExpiraEm: string | null = null;
      if (session.mode === 'subscription' && session.subscription) {
        const subId = session.subscription as string;
        const sub = await stripe.subscriptions.retrieve(subId);
        planoExpiraEm = new Date(sub.current_period_end * 1000).toISOString();
      }

      if (userId) {
        await admin.from('users').update({ plano: 'pro', plano_expira_em: planoExpiraEm }).eq('id', userId);
      }
    }

    // Você pode tratar outros eventos (customer.subscription.deleted, etc.) para downgrades
    return new Response('ok', { status: 200 });
  } catch (e) {
    return new Response((e as Error).message, { status: 400 });
  }
});