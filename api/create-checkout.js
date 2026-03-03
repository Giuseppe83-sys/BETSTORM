// api/create-checkout.js — Vercel Serverless Function
// ============================================================
// ENV VARS da impostare in Vercel Dashboard → Settings → Environment Variables:
//
//   STRIPE_SECRET_KEY        sk_live_xxxx
//   STRIPE_PRICE_PRO         price_xxxx   (Pro mensile — €9.99/mese)
//   STRIPE_PRICE_ELITE       price_xxxx   (Elite mensile — €19.99/mese)
//   NEXT_PUBLIC_SITE_URL     https://betstorm.it
//
// ============================================================

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // CORS
  const origin = process.env.NEXT_PUBLIC_SITE_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { plan, email, userId } = req.body;

    // Mappa plan → Stripe Price ID
    // 'pro'   → STRIPE_PRICE_PRO
    // 'elite' → STRIPE_PRICE_ELITE
    // Supporta sia 'pro'/'elite' (mensile default) che 'pro'+'annual'
    const billing = req.body.billing || 'monthly';
    const priceMap = {
      'pro_monthly':    process.env.STRIPE_PRICE_PRO,
      'pro_annual':     process.env.STRIPE_PRICE_PRO_ANNUAL    || process.env.STRIPE_PRICE_PRO,
      'elite_monthly':  process.env.STRIPE_PRICE_ELITE,
      'elite_annual':   process.env.STRIPE_PRICE_ELITE_ANNUAL  || process.env.STRIPE_PRICE_ELITE,
    };

    const key = `${plan}_${billing}`;
    const priceId = priceMap[key];
    if (!priceId) {
      return res.status(400).json({ error: `Piano non valido: ${plan} (${billing})` });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://betstorm.it';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/success.html?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${siteUrl}/#piani`,
      metadata: { userId: userId || '', plan, billing },
      subscription_data: {
        metadata: { userId: userId || '', plan, billing }
      },
      allow_promotion_codes: true,
      locale: 'it',
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
