const crypto = require('node:crypto');

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function page(title, message) {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escapeHtml(title)} — BetStorm</title></head><body style="margin:0;background:#071016;color:#eaf2f7;font-family:Arial,sans-serif"><main style="max-width:520px;margin:80px auto;padding:28px"><h1 style="color:#00e887">${escapeHtml(title)}</h1><p style="line-height:1.6">${escapeHtml(message)}</p><p><a href="https://www.betstorm.it/" style="color:#00e887">Torna a BetStorm</a></p></main></body></html>`;
}

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send(page('Metodo non consentito', 'Apri il collegamento dal browser.'));
  }
  const token = req.query?.token;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).send(page('Collegamento non valido', 'Il codice di conferma non è valido.'));
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).send(page('Servizio non disponibile', 'Riprova più tardi.'));
  }

  try {
    const base = process.env.SUPABASE_URL.replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
    const unsubscribeToken = crypto.randomBytes(32).toString('hex');
    const params = new URLSearchParams({
      confirmation_token_hash: `eq.${sha256(token)}`,
      confirmed: 'eq.false',
      unsubscribed: 'eq.false',
      confirmation_expires_at: `gt.${new Date().toISOString()}`
    });
    const response = await fetch(`${base}/rest/v1/newsletter?${params}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({
        confirmed: true,
        confirmed_at: new Date().toISOString(),
        confirmation_token_hash: null,
        confirmation_expires_at: null,
        unsubscribe_token_hash: sha256(unsubscribeToken)
      })
    });
    if (!response.ok) throw new Error(`Supabase PATCH HTTP ${response.status}`);
    const updated = await response.json();
    if (!Array.isArray(updated) || updated.length !== 1) {
      return res.status(400).send(page('Collegamento scaduto o già utilizzato', 'Il link non è più valido. Puoi richiedere una nuova iscrizione.'));
    }

    // La conferma è già stata salvata: un problema email non deve annullarla.
    const email = updated[0].email;
    const resendKey = process.env.RESEND_NEWSLETTER_API_KEY;
    if (!email || !resendKey) {
      console.error('[newsletter-confirm] Welcome email unavailable: missing email or RESEND_NEWSLETTER_API_KEY');
      return res.status(200).send(page('Email confermata', 'Iscrizione confermata. Non siamo riusciti a inviare il messaggio di benvenuto: contatta BetStorm per ricevere il link di disiscrizione.'));
    }

    const unsubscribeLink = `https://www.betstorm.it/api/newsletter-unsubscribe?token=${unsubscribeToken}`;
    const send = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'BetStorm <newsletter@betstorm.it>',
        to: [email],
        subject: 'Benvenuto in BetStorm — Iscrizione confermata',
        html: `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#17212b"><h2>Benvenuto in BetStorm!</h2><p>La tua iscrizione alla newsletter BetStorm è confermata.</p><p>Riceverai le comunicazioni della newsletter quando saranno disponibili.</p><p>Puoi <a href="${unsubscribeLink}">disiscriverti dalla newsletter</a> in qualsiasi momento.</p><p style="font-size:12px;color:#667">BetStorm · Contenuti informativi · 18+</p></div>`,
        text: `Benvenuto in BetStorm! La tua iscrizione alla newsletter è confermata. Per disiscriverti: ${unsubscribeLink}`
      })
    });
    if (!send.ok) {
      const detail = (await send.text()).slice(0, 400);
      console.error(`[newsletter-confirm] Resend welcome failed HTTP ${send.status}: ${detail}`);
      return res.status(200).send(page('Email confermata', 'Iscrizione confermata. Non siamo riusciti a inviare il messaggio di benvenuto: contatta BetStorm per ricevere il link di disiscrizione.'));
    }
    console.log('[newsletter-confirm] Welcome email accepted by Resend');
    return res.status(200).send(page('Email confermata', 'Iscrizione confermata! Ti abbiamo inviato un messaggio di benvenuto con il link per disiscriverti.'));
  } catch (error) {
    console.error('[newsletter-confirm]', error.message);
    return res.status(503).send(page('Verifica temporaneamente non disponibile', 'Non è stato possibile completare la richiesta. Riprova più tardi.'));
  }
};
