// api/matches.js — BetStorm
// Partite REALI da "Free API Live Football Data" su RapidAPI
// Nessun pronostico, percentuale o partita inventata.
//
// Vercel ENV:
// RAPIDAPI_KEY

const RAPID_HOST = 'free-api-live-football-data.p.rapidapi.com';

// Competizioni principali BetStorm.
// Gli ID sono quelli restituiti da questa API:
// Premier League 47
// Champions League 42
// LaLiga 87
// Serie A 55
const LEAGUES = {
  47: { name: 'Premier League', flag: '🏴' },
  42: { name: 'Champions League', flag: '⭐' },
  87: { name: 'LaLiga', flag: '🇪🇸' },
  55: { name: 'Serie A', flag: '🇮🇹' }
};

// Cache serverless
let cache = null;
let cacheTime = 0;

// 30 minuti
const CACHE_TTL = 30 * 60 * 1000;


// ============================================================
// DATE
// ============================================================

function dateForApi(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const p = Object.fromEntries(
    parts
      .filter(x => x.type !== 'literal')
      .map(x => [x.type, x.value])
  );

  // API vuole YYYYMMDD
  return `${p.year}${p.month}${p.day}`;
}


function todayRome() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const p = Object.fromEntries(
    parts
      .filter(x => x.type !== 'literal')
      .map(x => [x.type, x.value])
  );

  return `${p.year}-${p.month}-${p.day}`;
}


// ============================================================
// FORMATTAZIONE
// ============================================================

function formatDate(dateStr) {

  if (!dateStr) return '';

  const d = new Date(dateStr);

  const eventDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);


  const today = todayRome();


  const tomorrowDate = new Date();
  tomorrowDate.setUTCDate(
    tomorrowDate.getUTCDate() + 1
  );


  const tomorrow = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(tomorrowDate);


  if (eventDate === today) {
    return 'Oggi';
  }


  if (eventDate === tomorrow) {
    return 'Domani';
  }


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
    hour12: false
  }).format(new Date(dateStr));

}


// ============================================================
// RAPIDAPI
// ============================================================

async function getMatchesForDate(date) {

  const key = process.env.RAPIDAPI_KEY;

  if (!key) {
    throw new Error('RAPIDAPI_KEY non configurata');
  }


  const apiDate = dateForApi(date);


  /*
   * Endpoint verificato dal playground RapidAPI.
   *
   * Se RapidAPI mostra uno slug leggermente diverso nel Code Snippet,
   * sarà sufficiente modificare questa singola URL.
   */
  const url =
  `https://${RAPID_HOST}/football-get-matches-by-date-and-league?date=${apiDate}`;


  const response = await fetch(url, {

    headers: {

      'X-RapidAPI-Key': key,

      'X-RapidAPI-Host': RAPID_HOST

    }

  });


  if (!response.ok) {

    throw new Error(
      `RapidAPI HTTP ${response.status}`
    );

  }


  const data = await response.json();


  if (data.status !== 'success') {

    throw new Error(
      'RapidAPI non ha restituito status success'
    );

  }


  return Array.isArray(data.response)
    ? data.response
    : [];

}


// ============================================================
// RACCOLTA PARTITE
// ============================================================

async function fetchMatches() {

  const matches = [];

  const diagnostics = [];


  // Cerchiamo oggi + prossimi 6 giorni
  // = finestra totale 7 giorni.
  //
  // Una richiesta alla volta per evitare
  // di colpire troppo velocemente RapidAPI.
  for (let offset = 0; offset < 7; offset++) {

    const date = new Date();

    date.setUTCDate(
      date.getUTCDate() + offset
    );


    const apiDate = dateForApi(date);


    try {

      const competitions =
        await getMatchesForDate(date);


      let added = 0;


      for (const competition of competitions) {

        const leagueId =
          Number(competition.id);


        // Teniamo soltanto le competizioni
        // che interessano BetStorm.
        if (!LEAGUES[leagueId]) {
          continue;
        }


        const league =
          LEAGUES[leagueId];


        const games =
          Array.isArray(competition.matches)
            ? competition.matches
            : [];


        for (const game of games) {

          // Escludiamo partite annullate/posticipate
          if (game.status?.cancelled) {
            continue;
          }


          // Per "prossime partite" non mostriamo
          // quelle già terminate.
          if (game.status?.finished) {
            continue;
          }


          const utcTime =
            game.status?.utcTime;


          if (!utcTime) {
            continue;
          }


          matches.push({

            fixture_id:
              game.id ?? null,

            league_id:
              leagueId,

            home:
              game.home?.name || '?',

            away:
              game.away?.name || '?',

            league:
              `${league.name} ${league.flag}`,

            when:
              `${formatDate(utcTime)} · ${formatTime(utcTime)}`,

            date:
              utcTime

          });


          added++;

        }

      }


      diagnostics.push({

        date:
          apiDate,

        status:
          200,

        competitions:
          competitions.length,

        matches_added:
          added

      });


    } catch (error) {

      diagnostics.push({

        date:
          apiDate,

        status:
          'error',

        message:
          error.message

      });

    }


    /*
     * Piccola pausa fra richieste.
     * Aiuta a evitare chiamate troppo ravvicinate.
     */
    if (offset < 6) {

      await new Promise(
        resolve => setTimeout(resolve, 350)
      );

    }

  }


  // Ordine cronologico
  matches.sort(
    (a, b) =>
      new Date(a.date) - new Date(b.date)
  );


  return {

    matches:
      matches.slice(0, 12),

    source:
      'free-api-live-football-data',

    updated:
      new Date().toISOString(),

    diagnostics

  };

}


// ============================================================
// VERCEL
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


  // Cache
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


  } catch (error) {

    return res.status(502).json({

      matches: [],

      source:
        'free-api-live-football-data',

      error:
        'Servizio partite temporaneamente non disponibile',

      updated:
        new Date().toISOString()

    });

  }

};
