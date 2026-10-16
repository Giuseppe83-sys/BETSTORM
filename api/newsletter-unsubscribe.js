
const crypto = require('node:crypto');

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function page(title, message, form = '') {
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>${escapeHtml(title)} — BetStorm</title>
</head>
<body style="margin:0;background:#071016;color:#eaf2f7;font-family:Arial,sans-serif">
  <main style="max-width:520px;margin:70px auto;padding:28px">
    <h1 style="color:#00e887">${escapeHtml(title)}</h1>
    <p style="line-height:1.6">${escapeHtml(message)}</p>
    ${form}
    <p style="margin-top:30px">
      <a href="https://www.betstorm.it/" style="color:#00e887">Torna a BetStorm</a>
    </p>
  </main>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).send(page(
      'Metodo non consentito',
      'Richiesta non valida.'
    ));
  }

  const token = req.method === 'GET'
    ? req.query?.token
    : req.body?.token;

  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).send(page(
      'Link non valido',
      'Il collegamento di disiscrizione non è valido.'
    ));
  }

  if (req.method === 'GET') {
    return res.status(200).send(page(
      'Disiscrizione newsletter',
      'Vuoi smettere di ricevere la newsletter BetStorm?',
      `<form method="POST" action="/api/newsletter-unsubscribe">
        <input type="hidden" name="token" value="${token}">
        <button type="submit" style="background:#00e887;color:#071016;border:0;border-radius:8px;padding:14px 22px;font-size:16px;font-weight:bold;cursor:pointer">
          Conferma disiscrizione
        </button>
      </form>`
    ));
  }

  if (!process.env.SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).send(page(
      'Servizio non disponibile',
      'Riprova più tardi.'
    ));
  }

  try {
    const hash = crypto.createHash('sha256')
      .update(token)
      .digest('hex');

    const base = process.env.SUPABASE_URL.replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const params = new URLSearchParams({
      unsubscribe_token_hash: `eq.${hash}`,
      confirmed: 'eq.true',
      unsubscribed: 'eq.false'
    });

    const response = await fetch(
      `${base}/rest/v1/newsletter?${params}`,
      {
        method: 'PATCH',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify({
          unsubscribed: true,
          unsubscribed_at: new Date().toISOString(),
          unsubscribe_token_hash: null
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase HTTP ${response.status}`);
    }

    const updated = await response.json();

    if (!Array.isArray(updated) || updated.length !== 1) {
      return res.status(400).send(page(
        'Link non disponibile',
        'Questo link non è valido oppure è già stato utilizzato.'
      ));
    }

    return res.status(200).send(page(
      'Disiscrizione completata',
      'Non riceverai più la newsletter BetStorm.'
    ));

  } catch (error) {
    console.error('[newsletter-unsubscribe]', error.message);

    return res.status(503).send(page(
      'Operazione non riuscita',
      'Non è stato possibile completare la disiscrizione. Riprova più tardi.'
    ));
  }
};
