// api/stripe-webhook.js
// Vercel Serverless Function — Stripe Webhook
// ============================================================
// SETUP in Vercel env:
//   STRIPE_WEBHOOK_SECRET=whsec_...
//   SUPABASE_URL=https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY=eyJ...  (service_role key, NON la anon)
// ============================================================

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Vercel: disabilita body parser per leggere raw body
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(Buffer.from(data)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  const session = event.data.object;

  switch (event.type) {

    case 'checkout.session.completed': {
      const { userId, plan } = session.metadata;
      await supabase.from('profiles').update({
        plan,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        subscription_status: 'active'
      }).eq('id', userId);
      console.log(`✅ Abbonamento attivato: user=${userId} plan=${plan}`);
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const plan = sub.metadata?.plan || 'free';
      await supabase.from('profiles').update({
        plan,
        subscription_status: sub.status
      }).eq('stripe_subscription_id', sub.id);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await supabase.from('profiles').update({
        plan: 'free',
        subscription_status: 'cancelled',
        stripe_subscription_id: null
      }).eq('stripe_subscription_id', sub.id);
      console.log(`❌ Abbonamento cancellato: ${sub.id}`);
      break;
    }

    case 'invoice.payment_failed': {
      await supabase.from('profiles').update({
        subscription_status: 'past_due'
      }).eq('stripe_customer_id', session.customer);
      break;
    }

    default:
      console.log(`Evento non gestito: ${event.type}`);
  }

  res.status(200).json({ received: true });
};
