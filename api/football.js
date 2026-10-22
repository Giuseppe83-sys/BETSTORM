
```javascript
// BetStorm — proxy sicuro football-data.org (Vercel Serverless Function)
// Posizione nel repository: api/football.js

const BASE = 'https://api.football-data.org/v4';

const ALLOWED_COMPETITIONS = new Set([
  'SA', 'PL', 'PD', 'BL1', 'FL1',
  'DED', 'PPL', 'CL', 'EL', 'EC', 'WC'
]);

const ALLOWED_STATUSES = new Set([
  'SCHEDULED',
  'TIMED',
  'IN_PLAY',
  'PAUSED',
  'FINISHED',
  'SUSPENDED',
  'POSTPONED',
  'CANCELLED',
  'AWARDED'
]);

function validDate(value) {
  if (typeof value !== 'string') return false;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

module.exports = async function handler(req, res) {
  res.setHeader(
    'Content-Type',
    'application/json; charset=utf-8'
  );

  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');

    return res.status(405).json({
      error: 'Metodo non consentito'
    });
  }

  const key = process.env.FOOTBALL_DATA_API_KEY;

  if (!key) {
    return res.status(503).json({
      error: 'Fonte sportiva non configurata'
    });
  }

  const type =
    typeof req.query.type === 'string'
      ? req.query.type
      : 'competitions';

  let path;

  if (type === 'competitions') {
    path = '/competitions';

  } else if (
    type === 'matches' ||
    type === 'standings'
  ) {
    const code =
      typeof req.query.code === 'string'
        ? req.query.code.toUpperCase()
        : '';

    if (!ALLOWED_COMPETITIONS.has(code)) {
      return res.status(400).json({
        error: 'Competizione non supportata'
      });
    }

    path = `/competitions/${code}/${type}`;

    // Filtri facoltativi per i risultati storici
    if (type === 'matches') {
      const params = new URLSearchParams();

      const dateFrom = req.query.dateFrom;
      const dateTo = req.query.dateTo;
      const status = req.query.status;

      if (dateFrom !== undefined) {
        if (!validDate(dateFrom)) {
          return res.status(400).json({
            error: 'dateFrom non valida. Usa YYYY-MM-DD'
          });
        }

        params.set('dateFrom', dateFrom);
      }

      if (dateTo !== undefined) {
        if (!validDate(dateTo)) {
          return res.status(400).json({
            error: 'dateTo non valida. Usa YYYY-MM-DD'
          });
        }

        params.set('dateTo', dateTo);
      }

      if (
        dateFrom &&
        dateTo &&
        dateFrom > dateTo
      ) {
        return res.status(400).json({
          error: 'dateFrom deve precedere dateTo'
        });
      }

      if (status !== undefined) {
        if (
          typeof status !== 'string' ||
          !ALLOWED_STATUSES.has(status.toUpperCase())
        ) {
          return res.status(400).json({
            error: 'Stato partita non valido'
          });
        }

        params.set('status', status.toUpperCase());
      }

      const query = params.toString();

      if (query) {
        path += `?${query}`;
      }
    }

  } else {
    return res.status(400).json({
      error: 'Tipo di richiesta non supportato'
    });
  }

  try {
    const upstream = await fetch(BASE + path, {
      headers: {
        'X-Auth-Token': key,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(9000)
    });

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return res.status(429).json({
          error: 'Limite temporaneo della fonte raggiunto. Riprova più tardi.'
        });
      }

      if (
        upstream.status === 403 ||
        upstream.status === 404
      ) {
        return res.status(502).json({
          error:
            'Dati non inclusi nella copertura gratuita o non disponibili'
        });
      }

      return res.status(502).json({
        error:
          'Fonte sportiva temporaneamente non disponibile'
      });
    }

    const data = await upstream.json();

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=600, stale-while-revalidate=1800'
    );

    return res.status(200).json({
      source: 'football-data.org',
      fetched_at: new Date().toISOString(),
      data
    });

  } catch (error) {
    return res.status(504).json({
      error:
        'Tempo di risposta della fonte scaduto'
    });
  }
};
```
