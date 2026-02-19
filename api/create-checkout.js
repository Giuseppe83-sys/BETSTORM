// api/create-checkout.js
// Vercel Serverless Function — Stripe Checkout
// ============================================================
// SETUP: In Vercel dashboard aggiungi queste env variables:
//   STRIPE_SECRET_KEY=sk_live_...
//   STRIPE_PRICE_PRO=price_...       (ID del prezzo Pro mensile)
//   STRIPE_PRICE_PRO_ANNUAL=price_...(ID del prezzo Pro annuale)
//   STRIPE_PRICE_ELITE=price_...
//   STRIPE_PRICE_ELITE_ANNUAL=price_...
//   NEXT_PUBLIC_SITE_URL=https://betstorm.com
// ============================================================

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_SITE_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { plan, billing, email, userId } = req.body;

    // Mappa plan → Stripe Price ID
    const priceMap = {
      'pro_monthly':    process.env.STRIPE_PRICE_PRO,
      'pro_annual':     process.env.STRIPE_PRICE_PRO_ANNUAL,
      'elite_monthly':  process.env.STRIPE_PRICE_ELITE,
      'elite_annual':   process.env.STRIPE_PRICE_ELITE_ANNUAL,
    };

    const key = `${plan}_${billing}`;
    const priceId = priceMap[key];
    if (!priceId) return res.status(400).json({ error: 'Piano non valido' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.NEXT_PUBLIC_SITE_URL}/#piani`,
      metadata: { userId, plan, billing },
      subscription_data: {
        metadata: { userId, plan }
      },
      allow_promotion_codes: true,
      locale: 'it',
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err.message });
  }
};
