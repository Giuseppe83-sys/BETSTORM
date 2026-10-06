// api/live.js — Vercel Serverless Function
// Proxy server-side per risultati live RapidAPI.
// ENV Vercel richiesta: RAPIDAPI_KEY

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000; // 60 secondi

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  const now = Date.now();

  // Usa la cache per evitare chiamate inutili a RapidAPI
  if (cache && (now - cacheTime) < CACHE_TTL) {
    return res.status(200).json(cache);
  }

  // La chiave viene letta dalle Environment Variables di Vercel
  const key = process.env.RAPIDAPI_KEY;

  if (!key) {
    return res.status(503).json({
      error: 'Live service not configured'
    });
  }

  try {
    const upstream = await fetch(
      'https://free-api-live-football-data.p.rapidapi.com/football-current-live',
      {
        headers: {
          'X-RapidAPI-Key': key,
          'X-RapidAPI-Host': 'free-api-live-football-data.p.rapidapi.com'
        }
      }
    );

    if (!upstream.ok) {
      return res.status(502).json({
        error: 'Live provider unavailable'
      });
    }

    const data = await upstream.json();

    // Salva temporaneamente la risposta in cache
    cache = data;
    cacheTime = now;

    // Restituisce al sito gli stessi dati ricevuti da RapidAPI,
    // ma senza esporre la chiave nel browser.
    return res.status(200).json(data);

  } catch (err) {
    return res.status(502).json({
      error: 'Live provider unavailable'
    });
  }
};
