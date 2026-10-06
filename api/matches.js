// api/matches.js — Vercel Serverless Function
// Prossime partite REALI da API-Football (RapidAPI)
// Nessun fallback statico e nessuna probabilità inventata.
// ENV necessaria: RAPIDAPI_KEY

const LEAGUES = [
  { id: 135, name: 'Serie A',          flag: '🇮🇹' },
  { id: 39,  name: 'Premier League',   flag: '🏴' },
  { id: 140, name: 'La Liga',          flag: '🇪🇸' },
  { id: 2,   name: 'Champions League', flag: '⭐' },
];

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000;


// ============================================================
// DATA / STAGIONE
// ============================================================

function romeDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter(p => p.type !== 'literal')
      .map(p => [p.type, p.value])
  );
}


function isoDateRome(date = new Date()) {
  const p = romeDateParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}


function seasonForCompetition(date = new Date()) {
  const p = romeDateParts(date);

  const year = Number(p.year);
  const month = Number(p.month);

  // Esempio:
  // ottobre 2026 -> stagione 2026/27 -> API season=2026
  // marzo 2027   -> stagione 2026/27 -> API season=2026
  return month >= 8 ? year : year - 1;
}


// ============================================================
// FORMATTAZIONE
// ============================================================

function formatDate(dateStr) {
  if (!dateStr) return '';

  const d = new Date(dateStr);

  const eventDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);

  const today = isoDateRome();

  const tomorrowDate = new Date();
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const tomorrow = isoDateRome(tomorrowDate);

  if (eventDay === today) return 'Oggi';
  if (eventDay === tomorrow) return 'Domani';

  return new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    weekday: 'short',
    day: 'numeric',
    month: 'numeric'
  }).format(d);
}


function formatTime(dateStr) {
  if (!dateStr) return '';

  return new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(dateStr));
}


// ============================================================
// API-FOOTBALL
// ============================================================

async function fetchMatches() {

  const key = process.env.RAPIDAPI_KEY;

  // IMPORTANTE:
  // niente partite inventate se manca la chiave
  if (!key) {
    return {
      matches: [],
      source: 'unavailable',
      error: 'RAPIDAPI_KEY non configurata',
      updated: new Date().toISOString(),
    };
  }


  const today = new Date();

  const in7 = new Date(today);
  in7.setUTCDate(in7.getUTCDate() + 7);

  const from = isoDateRome(today);
  const to = isoDateRome(in7);

  const season = seasonForCompetition(today);

  const all = [];
  const diagnostics = [];


  for (const league of LEAGUES) {

    const url =
      `https://api-football-v1.p.rapidapi.com/v3/fixtures` +
      `?league=${league.id}` +
      `&season=${season}` +
      `&from=${from}` +
      `&to=${to}` +
      `&status=NS`;

    try {

      const response = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': key,
          'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
        },
      });


      // Registriamo lo status per capire subito
      // se RapidAPI rifiuta la richiesta.
      if (!response.ok) {

        diagnostics.push({
          league: league.id,
          name: league.name,
          status: response.status
        });

        continue;
      }


      const data = await response.json();

      const fixtures = Array.isArray(data.response)
        ? data.response
        : [];


      diagnostics.push({
        league: league.id,
        name: league.name,
        status: 200,
        fixtures: fixtures.length
      });


      fixtures.forEach(f => {

        const date = f.fixture?.date;

        if (!date) return;


        all.push({

          fixture_id: f.fixture?.id ?? null,

          home:
            f.teams?.home?.name || '?',

          away:
            f.teams?.away?.name || '?',

          league:
            `${league.name} ${league.flag}`,

          when:
            `${formatDate(date)} · ${formatTime(date)}`,

          date: date

        });

      });


    } catch (err) {

      diagnostics.push({
        league: league.id,
        name: league.name,
        status: 'fetch_error'
      });

    }

  }


  // Ordine cronologico
  all.sort(
    (a, b) =>
      new Date(a.date) - new Date(b.date)
  );


  return {

    matches:
      all.slice(0, 12),

    source:
      'api',

    season:
      season,

    range: {
      from,
      to
    },

    updated:
      new Date().toISOString(),

    diagnostics:
      diagnostics

  };

}


// ============================================================
// VERCEL HANDLER
// ============================================================

module.exports = async (req, res) => {

  res.setHeader(
    'Access-Control-Allow-Origin',
    '*'
  );

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET'
  );

  res.setHeader(
    'Content-Type',
    'application/json'
  );

  res.setHeader(
    'Cache-Control',
    's-maxage=300, stale-while-revalidate=600'
  );


  if (
    req.method &&
    req.method !== 'GET'
  ) {

    return res.status(405).json({
      error: 'Method not allowed'
    });

  }


  const now = Date.now();


  // Cache memoria
  if (
    cache &&
    (now - cacheTime) < CACHE_TTL
  ) {

    return res.status(200).json({
      ...cache,
      cached: true
    });

  }


  try {

    const data =
      await fetchMatches();

    cache =
      data;

    cacheTime =
      now;

    return res
      .status(200)
      .json(data);


  } catch (err) {

    // Anche in caso di errore:
    // NESSUNA partita inventata.
    return res.status(502).json({

      matches: [],

      source:
        'error',

      error:
        'Servizio partite temporaneamente non disponibile',

      updated:
        new Date().toISOString()

    });

  }

};
