// api/analizza.js — BetStorm Schedina Analyzer Proxy
// Vercel Serverless Function — Node.js
// Receives: {email, picks, imageBase64?} from homepage form
// Uploads image to Supabase if present, calls CodeWords service, returns result

export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };

const CW_SERVICE_ID = 'betstorm_schedina_analyzer_cb8492e3';
const CW_RUNTIME    = 'https://runtime.codewords.ai';
const SUPABASE_URL  = process.env.SUPABASE_URL || 'https://zvftggieqlxujjtotvwg.supabase.co';
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CW_API_KEY    = process.env.CODEWORDS_API_KEY;

// Upload base64 image to Supabase Storage and return public URL
async function uploadImageToSupabase(base64Data, filename) {
  // Strip data URL prefix if present
  const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const mimeMatch = base64Data.match(/data:([^;]+);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const ext  = mime.split('/')[1] || 'jpg';
  const key  = `schedine/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const buf = Buffer.from(base64, 'base64');
  const uploadResp = await fetch(
    `${SUPABASE_URL}/storage/v1/object/betstorm-data/${key}`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': mime,
        'x-upsert': 'true',
      },
      body: buf,
    }
  );

  if (!uploadResp.ok) {
    const err = await uploadResp.text();
    throw new Error(`Supabase upload failed: ${err}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/betstorm-data/${key}`;
}

export default async function handler(req, res) {
  // CORS for same-origin requests
  res.setHeader('Access-Control-Allow-Origin', 'https://www.betstorm.it');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, picks, imageBase64 } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Email non valida' });
    }

    const payload = { email };

    // Handle picks (manual input)
    if (Array.isArray(picks) && picks.length > 0) {
      payload.picks = picks.slice(0, 15).map(p => ({
        home: String(p.home || '').trim(),
        away: String(p.away || '').trim(),
        bet:  String(p.bet  || '').trim(),
        quota: parseFloat(p.quota) || 2.0,
      })).filter(p => p.home && p.away);
    }

    // Handle image upload
    if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 100) {
      const imageUrl = await uploadImageToSupabase(imageBase64);
      payload.slip_image_url = imageUrl;
    }

    if (!payload.picks?.length && !payload.slip_image_url) {
      return res.status(400).json({ error: 'Inserisci almeno un pick o una foto della schedina' });
    }

    // Call CodeWords service
    const cwResp = await fetch(`${CW_RUNTIME}/run/${CW_SERVICE_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CW_API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120_000), // 2 min timeout
    });

    if (!cwResp.ok) {
      const errText = await cwResp.text();
      console.error('CodeWords error:', errText);
      return res.status(502).json({ error: 'Errore durante l\'analisi. Riprova tra qualche minuto.' });
    }

    const result = await cwResp.json();
    return res.status(200).json(result);

  } catch (err) {
    console.error('Schedina analyzer error:', err);
    return res.status(500).json({ error: 'Errore interno. Riprova tra qualche minuto.' });
  }
}
