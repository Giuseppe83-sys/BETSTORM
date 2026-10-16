// BetStorm — proxy NBA (BALLDONTLIE). Salvare in api/basket.js.
// La chiave resta esclusivamente nelle variabili d'ambiente di Vercel.
const BASE = 'https://api.balldontlie.io/v1';

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const key = process.env.BALLDONTLIE_API_KEY;
  if (!key) return res.status(503).json({ error: 'Fonte NBA non configurata su Vercel' });

  const type = typeof req.query.type === 'string' ? req.query.type : 'teams';
  let endpoint;
  if (type === 'teams') {
    endpoint = '/teams';
  } else if (type === 'games') {
    const season = Number(req.query.season);
    if (!Number.isInteger(season) || season < 1979 || season > new Date().getUTCFullYear()) {
      return res.status(400).json({ error: 'Indica una stagione NBA valida (es. season=2025)' });
    }
    const params = new URLSearchParams({ 'seasons[]': String(season), per_page: '100' });
    if (req.query.cursor !== undefined) {
      const cursor = String(req.query.cursor);
      if (!/^\d{1,15}$/.test(cursor)) return res.status(400).json({ error: 'Cursor non valido' });
      params.set('cursor', cursor);
    }
    endpoint = '/games?' + params.toString();
  } else {
    return res.status(400).json({ error: 'Tipo di richiesta non supportato' });
  }

  try {
    const response = await fetch(BASE + endpoint, {
      headers: { Authorization: key, Accept: 'application/json' },
      signal: AbortSignal.timeout(9000)
    });
    if (!response.ok) {
      if (response.status === 429) return res.status(429).json({ error: 'Limite richieste NBA raggiunto: riprova tra un minuto' });
      if (response.status === 401) return res.status(502).json({ error: 'Chiave NBA non accettata dalla fonte' });
      if (response.status === 403) return res.status(403).json({ error: 'Questi dati non sono inclusi nel piano API NBA attuale' });
      return res.status(502).json({ error: 'Fonte NBA temporaneamente non disponibile' });
    }
    const data = await response.json();
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
    return res.status(200).json({ source: 'balldontlie', fetched_at: new Date().toISOString(), data });
  } catch (_) {
    return res.status(504).json({ error: 'Tempo di risposta della fonte NBA scaduto' });
  }
};
