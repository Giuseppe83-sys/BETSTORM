// api/analizza.js — BetStorm Schedina Analyzer (CommonJS, Vercel-compatible)
// Riceve: {email, picks, imageBase64?} → chiama CodeWords service → ritorna analisi

const CW_SERVICE_ID  = 'betstorm_schedina_analyzer_cb8492e3';
const CW_RUNTIME     = 'https://runtime.codewords.ai';
const SUPABASE_URL   = process.env.SUPABASE_URL  || 'https://zvftggieqlxujjtotvwg.supabase.co';
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CW_API_KEY     = process.env.CODEWORDS_API_KEY;

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Debug: log env var presence (not values)
  console.log('[analizza] CW_API_KEY present:', !!CW_API_KEY);
  console.log('[analizza] SUPABASE_KEY present:', !!SUPABASE_KEY);

  try {
    const { email, picks, imageBase64 } = req.body || {};

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Email non valida' });
    }

    const payload = { email };

    // Picks manuali
    if (Array.isArray(picks) && picks.length > 0) {
      payload.picks = picks.slice(0, 15)
        .map(p => ({
          home:  String(p.home  || '').trim(),
          away:  String(p.away  || '').trim(),
          bet:   String(p.bet   || '').trim(),
          quota: parseFloat(p.quota) || 2.0,
        }))
        .filter(p => p.home && p.bet);
    }

    // Foto schedina: upload su Supabase → URL pubblico
    if (imageBase64 && SUPABASE_KEY && imageBase64.length > 100) {
      const base64  = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      const mime    = (imageBase64.match(/data:([^;]+);/) || [])[1] || 'image/jpeg';
      const ext     = mime.split('/')[1] || 'jpg';
      const key     = `schedine/${Date.now()}.${ext}`;
      const buf     = Buffer.from(base64, 'base64');

      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/betstorm-data/${key}`, {
        method:  'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': mime, 'x-upsert': 'true' },
        body:    buf,
      });
      if (up.ok) payload.slip_image_url = `${SUPABASE_URL}/storage/v1/object/public/betstorm-data/${key}`;
    }

    if (!payload.picks?.length && !payload.slip_image_url) {
      return res.status(400).json({ error: 'Inserisci almeno un pick o carica una foto' });
    }

    console.log('[analizza] Calling CodeWords service, picks:', payload.picks?.length || 0);

    // Chiama il servizio CodeWords (no AbortSignal per compatibilità)
    const cwResp = await fetch(`${CW_RUNTIME}/run/${CW_SERVICE_ID}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CW_API_KEY}` },
      body:    JSON.stringify(payload),
    });

    console.log('[analizza] CodeWords response status:', cwResp.status);

    if (!cwResp.ok) {
      const errText = await cwResp.text().catch(() => 'no body');
      console.error('[analizza] CodeWords error:', cwResp.status, errText.slice(0, 200));
      return res.status(502).json({
        error: `Errore analisi (${cwResp.status}). Riprova tra qualche minuto.`
      });
    }

    const result = await cwResp.json();
    console.log('[analizza] Success. email_sent:', result.email_sent);
    return res.status(200).json(result);

  } catch (err) {
    console.error('[analizza] Unhandled error:', err.message);
    return res.status(500).json({ error: 'Errore interno. Riprova tra qualche minuto.' });
  }
};
