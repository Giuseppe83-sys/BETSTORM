// api/matches.js — Vercel Serverless Function
// Partite prossimi 7 giorni da API-Football (RapidAPI)
// ============================================================
// ENV VAR necessaria su Vercel:
//   RAPIDAPI_KEY = la tua chiave RapidAPI
// ============================================================

const LEAGUES = [
  { id: 135, name: 'Serie A',         flag: '🇮🇹' },
  { id: 39,  name: 'Premier League',  flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 140, name: 'La Liga',         flag: '🇪🇸' },
  { id: 2,   name: 'Champions League',flag: '⭐' },
];

const BET_TYPES = [
  { bet: 'Goal / Goal',       base: 0.60 },
  { bet: 'Over 2.5 Gol',     base: 0.58 },
  { bet: 'Vittoria Casa',     base: 0.52 },
  { bet: 'Doppia Chance 1X',  base: 0.68 },
  { bet: 'Over 1.5 Gol',     base: 0.74 },
  { bet: 'Under 3.5 Gol',    base: 0.70 },
];

// Cache in memoria (1 ora)
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000;

function calcProb(fixture) {
  const seed = ((fixture.teams?.home?.name || '') + (fixture.teams?.away?.name || ''))
    .split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const betType  = BET_TYPES[seed % BET_TYPES.length];
  const variation = ((seed % 22) - 11) / 100;
  const pct = Math.round(Math.min(90, Math.max(56, (betType.base + variation) * 100)));
  return { bet: betType.bet, pct };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d     = new Date(dateStr);
  const today = new Date();
  const tom   = new Date(today); tom.setDate(today.getDate() + 1);
  const days  = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  if (d.toDateString() === today.toDateString()) return 'Oggi';
  if (d.toDateString() === tom.toDateString())   return 'Domani';
  return `${days[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('it-IT', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome'
  });
}

// Fallback statico — usato quando non c'è API key o l'API fallisce
function getStaticFallback() {
  const today = new Date();
  const d = (offset, h, m) => {
    const dt = new Date(today);
    dt.setDate(today.getDate() + offset);
    dt.setHours(h, m, 0, 0);
    return dt.toISOString();
  };
  return [
    { home:'Inter',          away:'Juventus',       league:'Serie A 🇮🇹',          when:'Domani · 20:45', bet:'Doppia Chance 1X', pct:71, date: d(1,20,45) },
    { home:'Arsenal',        away:'Real Madrid',    league:'Champions League ⭐',   when:'Dom · 21:00',    bet:'Goal / Goal',      pct:74, date: d(2,21,0)  },
    { home:'Liverpool',      away:'Man City',       league:'Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿',  when:'Sab · 16:30',    bet:'Over 2.5 Gol',     pct:78, date: d(3,16,30) },
    { home:'Napoli',         away:'Milan',          league:'Serie A 🇮🇹',          when:'Dom · 18:00',    bet:'Goal / Goal',      pct:68, date: d(3,18,0)  },
    { home:'Barcellona',     away:'Atletico Madrid',league:'La Liga 🇪🇸',           when:'Sab · 21:00',    bet:'Over 1.5 Gol',     pct:80, date: d(4,21,0)  },
    { home:'Bayern Monaco',  away:'PSG',            league:'Champions League ⭐',   when:'Mar · 21:00',    bet:'Goal / Goal',      pct:72, date: d(5,21,0)  },
  ];
}

async function fetchMatches() {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return { matches: getStaticFallback(), source: 'static' };

  const today  = new Date();
  const in7    = new Date(today); in7.setDate(today.getDate() + 7);
  const fmt    = d => d.toISOString().split('T')[0];
  const season = today.getFullYear() >= 2026 ? 2025 : today.getFullYear();
  const all    = [];

  for (const league of LEAGUES) {
    try {
      const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures?league=${league.id}&season=${season}&from=${fmt(today)}&to=${fmt(in7)}&status=NS`;
      const res = await fetch(url, {
        headers: {
          'X-RapidAPI-Key':  key,
          'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
        }
      });
      if (!res.ok) continue;
      const data = await res.json();
      (data.response || []).forEach(f => {
        const { bet, pct } = calcProb(f);
        all.push({
          home:   f.teams?.home?.name || '?',
          away:   f.teams?.away?.name || '?',
          league: `${league.name} ${league.flag}`,
          when:   `${formatDate(f.fixture?.date)} · ${formatTime(f.fixture?.date)}`,
          date:   f.fixture?.date,
          bet,
          pct,
        });
      });
    } catch(_) { continue; }
  }

  if (!all.length) return { matches: getStaticFallback(), source: 'static_fallback' };
  all.sort((a, b) => new Date(a.date) - new Date(b.date));
  return { matches: all.slice(0, 12), source: 'api', updated: new Date().toISOString() };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');

  const now = Date.now();
  if (cache && (now - cacheTime) < CACHE_TTL) {
    return res.status(200).json({ ...cache, cached: true });
  }

  try {
    const data  = await fetchMatches();
    cache       = data;
    cacheTime   = now;
    return res.status(200).json(data);
  } catch (err) {
    return res.status(200).json({ matches: getStaticFallback(), source: 'error_fallback' });
  }
};
