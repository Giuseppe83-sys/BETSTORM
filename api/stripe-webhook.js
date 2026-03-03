// api/stripe-webhook.js — Vercel Serverless Function
// ============================================================
// ENV VARS da impostare in Vercel Dashboard → Settings → Environment Variables:
//
//   STRIPE_SECRET_KEY        sk_live_xxxx
//   STRIPE_WEBHOOK_SECRET    whsec_xxxx   (da Stripe Dashboard → Webhooks)
//   SUPABASE_URL             https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY     eyJ...       (service_role key — NON la anon key)
//
// Endpoint webhook da registrare su Stripe:
//   https://betstorm.it/api/stripe-webhook
//
// Eventi da abilitare su Stripe:
//   checkout.session.completed
//   customer.subscription.updated
//   customer.subscription.deleted
//   invoice.payment_failed
// ============================================================

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Usa service_role key per aggiornare i profili lato server
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Disabilita body parser di Vercel — Stripe richiede il raw body per verificare la firma
module.exports.config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig     = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`📩 Stripe event: ${event.type}`);

  try {
    switch (event.type) {

      // Pagamento completato — attiva il piano
      case 'checkout.session.completed': {
        const session  = event.data.object;
        const userId   = session.metadata?.userId;
        const plan     = session.metadata?.plan || 'pro';
        if (!userId) { console.warn('⚠️ checkout.session.completed: userId mancante'); break; }

        const { error } = await supabase.from('profiles').update({
          plan,
          stripe_customer_id:      session.customer,
          stripe_subscription_id:  session.subscription,
          subscription_status:     'active',
          updated_at:              new Date().toISOString(),
        }).eq('id', userId);

        if (error) console.error('Supabase update error:', error);
        else console.log(`✅ Piano attivato: user=${userId} plan=${plan}`);
        break;
      }

      // Abbonamento aggiornato (upgrade/downgrade/rinnovo)
      case 'customer.subscription.updated': {
        const sub  = event.data.object;
        const plan = sub.metadata?.plan || 'pro';

        const { error } = await supabase.from('profiles').update({
          plan,
          subscription_status: sub.status,
          updated_at:          new Date().toISOString(),
        }).eq('stripe_subscription_id', sub.id);

        if (error) console.error('Supabase update error:', error);
        else console.log(`🔄 Abbonamento aggiornato: ${sub.id} → ${sub.status}`);
        break;
      }

      // Abbonamento cancellato — ritorna a free
      case 'customer.subscription.deleted': {
        const sub = event.data.object;

        const { error } = await supabase.from('profiles').update({
          plan:                    'free',
          subscription_status:     'cancelled',
          stripe_subscription_id:  null,
          updated_at:              new Date().toISOString(),
        }).eq('stripe_subscription_id', sub.id);

        if (error) console.error('Supabase update error:', error);
        else console.log(`❌ Abbonamento cancellato: ${sub.id}`);
        break;
      }

      // Pagamento fallito
      case 'invoice.payment_failed': {
        const invoice = event.data.object;

        const { error } = await supabase.from('profiles').update({
          subscription_status: 'past_due',
          updated_at:          new Date().toISOString(),
        }).eq('stripe_customer_id', invoice.customer);

        if (error) console.error('Supabase update error:', error);
        else console.log(`⚠️ Pagamento fallito: customer=${invoice.customer}`);
        break;
      }

      default:
        console.log(`ℹ️ Evento non gestito: ${event.type}`);
    }
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message });
  }

  return res.status(200).json({ received: true });
};
