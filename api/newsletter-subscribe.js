
const crypto = require('node:crypto');

const MESSAGE = 'Se l’indirizzo è valido, riceverai un’email per confermare l’iscrizione.';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  };
}

async function db(path, options = {}) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const response = await fetch(`${base}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...supabaseHeaders(),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`Supabase HTTP ${response.status}`);
  }

  if (response.status === 204) return null;
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const { email, consent } = req.body || {};
  const address = typeof email === 'string'
    ? email.trim().toLowerCase()
    : '';

  if (!EMAIL_RE.test(address) || address.length > 254 || consent !== true) {
    return res.status(400).json({
      error: 'Inserisci una email valida e accetta la newsletter.'
    });
  }

  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL'
  ];

 const missing = required.filter(name => !process.env[name]);

if (missing.length) {
  console.error('[newsletter-subscribe] Variabili mancanti:', missing.join(', '));

  return res.status(503).json({
    error: 'Servizio temporaneamente non disponibile.'
  });
}

  try {
    const query = `newsletter?select=id,confirmed,unsubscribed&email=eq.${encodeURIComponent(address)}&limit=1`;
    const existing = await db(query);

    // Non modificare iscrizioni già confermate o disiscritte.
    if (existing.length && (
      existing[0].confirmed || existing[0].unsubscribed
    )) {
      return res.status(200).json({ message: MESSAGE });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256')
      .update(token)
      .digest('hex');

    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const record = {
      email: address,
      consent_at: now.toISOString(),
      confirmed: false,
      confirmed_at: null,
      confirmation_token_hash: tokenHash,
      confirmation_expires_at: expires.toISOString()
    };

    if (existing.length) {
      await db(`newsletter?id=eq.${encodeURIComponent(existing[0].id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(record)
      });
    } else {
      await db('newsletter', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          ...record,
          unsubscribed: false
        })
      });
    }

    const link = `https://betstorm.it/api/newsletter-confirm?token=${token}`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
        <h2>Conferma la newsletter BetStorm</h2>
        <p>Abbiamo ricevuto una richiesta di iscrizione alla newsletter informativa BetStorm.</p>
        <p><a href="${link}">Conferma il mio indirizzo email</a></p>
        <p>Questo link scade dopo 24 ore.</p>
        <p>Se non hai richiesto l'iscrizione, ignora questa email.</p>
      </div>
    `;

    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [address],
        subject: 'BetStorm — conferma la tua iscrizione',
        html
      })
    });

    if (!sent.ok) {
      throw new Error(`Resend HTTP ${sent.status}`);
    }

    return res.status(200).json({ message: MESSAGE });

  } catch (error) {
    console.error('[newsletter-subscribe]', error.message);
    return res.status(503).json({
      error: 'Iscrizione temporaneamente non disponibile. Riprova più tardi.'
    });
  }
};
