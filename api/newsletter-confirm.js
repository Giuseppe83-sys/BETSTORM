
const crypto = require('node:crypto');

function page(title, message) {
  const esc = value => String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  }[c]));

  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} — BetStorm</title>
</head>
<body style="margin:0;background:#071016;color:#eaf2f7;font-family:Arial,sans-serif">
  <main style="max-width:520px;margin:80px auto;padding:28px">
    <h1 style="color:#00e887">${esc(title)}</h1>
    <p>${esc(message)}</p>
    <p><a href="https://betstorm.it/" style="color:#00e887">Torna a BetStorm</a></p>
  </main>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send(page(
      'Metodo non consentito',
      'Questo collegamento deve essere aperto dal browser.'
    ));
  }

  const token = req.query && req.query.token;

  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).send(page(
      'Collegamento non valido',
      'Il codice di conferma non è valido.'
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

    const headers = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    };

    const url = `${base}/rest/v1/newsletter`;

    // L'aggiornamento avviene solo se il token è ancora valido.
    const query = new URLSearchParams({
      confirmation_token_hash: `eq.${hash}`,
      confirmed: 'eq.false',
      unsubscribed: 'eq.false',
      confirmation_expires_at: `gt.${new Date().toISOString()}`
    });

    const response = await fetch(`${url}?${query}`, {
      method: 'PATCH',
      headers: {
        ...headers,
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        confirmed: true,
        confirmed_at: new Date().toISOString(),
        confirmation_token_hash: null,
        confirmation_expires_at: null
      })
    });

    if (!response.ok) {
      throw new Error(`Supabase HTTP ${response.status}`);
    }

    const updated = await response.json();

    if (!Array.isArray(updated) || updated.length !== 1) {
      return res.status(400).send(page(
        'Collegamento scaduto o già utilizzato',
        'Il link non è più valido. Puoi richiedere una nuova iscrizione.'
      ));
    }

    return res.status(200).send(page(
      'Email confermata',
      'Il tuo indirizzo email è stato confermato correttamente.'
    ));

  } catch (error) {
    console.error('[newsletter-confirm]', error.message);

    return res.status(503).send(page(
      'Verifica temporaneamente non disponibile',
      'Non è stato possibile completare la conferma. Riprova più tardi.'
    ));
  }
};
