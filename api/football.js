// BetStorm — proxy sicuro football-data.org (Vercel Serverless Function)
// Posizione nel repository: api/football.js
const BASE = 'https://api.football-data.org/v4';
const ALLOWED_COMPETITIONS = new Set(['SA', 'PL', 'PD', 'BL1', 'FL1', 'DED', 'PPL', 'CL', 'EL', 'EC', 'WC']);

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Metodo non consentito' });
  }
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) return res.status(503).json({ error: 'Fonte sportiva non configurata' });

  const type = typeof req.query.type === 'string' ? req.query.type : 'competitions';
  let path;
  if (type === 'competitions') {
    path = '/competitions';
  } else if (type === 'matches' || type === 'standings') {
    const code = typeof req.query.code === 'string' ? req.query.code.toUpperCase() : '';
    if (!ALLOWED_COMPETITIONS.has(code)) {
      return res.status(400).json({ error: 'Competizione non supportata' });
    }
    path = `/competitions/${code}/${type}`;
  } else {
    return res.status(400).json({ error: 'Tipo di richiesta non supportato' });
  }

  try {
    const upstream = await fetch(BASE + path, {
      headers: { 'X-Auth-Token': key, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(9000)
    });
    if (!upstream.ok) {
      if (upstream.status === 429) {
        return res.status(429).json({ error: 'Limite temporaneo della fonte raggiunto. Riprova più tardi.' });
      }
      if (upstream.status === 403 || upstream.status === 404) {
        return res.status(502).json({ error: 'Dati non inclusi nella copertura gratuita o non disponibili' });
      }
      return res.status(502).json({ error: 'Fonte sportiva temporaneamente non disponibile' });
    }
    const data = await upstream.json();
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
    return res.status(200).json({ source: 'football-data.org', fetched_at: new Date().toISOString(), data });
  } catch (error) {
    return res.status(504).json({ error: 'Tempo di risposta della fonte scaduto' });
  }
};
