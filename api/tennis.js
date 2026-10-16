// BetStorm — proxy API-Tennis per Vercel. Salvare in api/tennis.js
// Provider: https://api-tennis.com/ — configurare TENNIS_API_KEY in Vercel.
const BASE = 'https://api.api-tennis.com/tennis/';
const isoDay = /^\d{4}-\d{2}-\d{2}$/;
const safeText = (v) => v == null ? '' : String(v).slice(0, 180);

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Metodo non consentito' });
  }
  const key = process.env.TENNIS_API_KEY;
  if (!key) return res.status(503).json({ error: 'API tennis non configurata: impostare TENNIS_API_KEY in Vercel.' });
  const date = typeof req.query.date === 'string' ? req.query.date : '';
  const tour = typeof req.query.tour === 'string' ? req.query.tour.toLowerCase() : 'all';
  if (!isoDay.test(date) || Number.isNaN(Date.parse(date + 'T00:00:00Z')) || new Date(date+'T00:00:00Z').toISOString().slice(0,10) !== date) {
    return res.status(400).json({ error: 'Data non valida (YYYY-MM-DD)' });
  }
  if (!['all', 'atp', 'wta'].includes(tour)) return res.status(400).json({ error: 'Circuito non valido' });

  const params = new URLSearchParams({ method: 'get_fixtures', APIkey: key, date_start: date, date_stop: date });
  try {
    const upstream = await fetch(BASE + '?' + params.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(9000)
    });
    if (upstream.status === 429) return res.status(429).json({ error: 'Limite API tennis raggiunto. Riprova più tardi.' });
    if (!upstream.ok) return res.status(502).json({ error: 'Fonte tennis non disponibile' });
    const body = await upstream.json();
    if (body.success !== 1 && body.success !== '1') return res.status(502).json({ error: 'La fonte tennis ha rifiutato la richiesta o la chiave API.' });
    if (!Array.isArray(body.result)) return res.status(502).json({ error: 'Formato risposta tennis inatteso' });

    const matches = body.result.flatMap(event => {
      const type = safeText(event.event_type_type || event.event_type || '');
      // Non classificare tornei ITF/Challenger come ATP o WTA.
      const isAtp = /\batp\b/i.test(type);
      const isWta = /\bwta\b/i.test(type);
      if (!isAtp && !isWta) return [];
      if (tour === 'atp' && !isAtp || tour === 'wta' && !isWta) return [];
      const player1 = safeText(event.event_first_player);
      const player2 = safeText(event.event_second_player);
      if (!player1 || !player2) return [];
      return [{
        id: safeText(event.event_key),
        tour: isAtp ? 'ATP' : 'WTA',
        tournament: safeText(event.tournament_name),
        round: safeText(event.event_round),
        player1, player2,
        status: safeText(event.event_status || event.event_live),
        score: safeText(event.event_final_result),
        // La fonte non garantisce il fuso dell'ora in tutti i piani:
        // non convertire arbitrariamente event_time in UTC.
        surface: safeText(event.event_surface)
      }];
    });
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ source: 'API-Tennis', fetched_at: new Date().toISOString(), matches });
  } catch (_) {
    return res.status(504).json({ error: 'Tempo di risposta della fonte tennis scaduto' });
  }
};
