// ============================================================
// BETSTORM — Database Squadre & Statistiche
// Aggiornato: 2025
// ============================================================

const BETSTORM_TEAMS = {

  "Serie A": [
    { id: "atalanta",    name: "Atalanta",          short: "ATA", form: [1,1,1,0,1], goals_scored_avg: 2.1, goals_conceded_avg: 1.0, home_win_pct: 0.62, away_win_pct: 0.44 },
    { id: "bologna",     name: "Bologna",            short: "BOL", form: [1,0,1,1,0], goals_scored_avg: 1.6, goals_conceded_avg: 1.3, home_win_pct: 0.52, away_win_pct: 0.36 },
    { id: "cagliari",    name: "Cagliari",           short: "CAG", form: [0,0,1,0,0], goals_scored_avg: 0.9, goals_conceded_avg: 1.8, home_win_pct: 0.32, away_win_pct: 0.22 },
    { id: "como",        name: "Como",               short: "COM", form: [0,1,0,0,1], goals_scored_avg: 1.1, goals_conceded_avg: 1.7, home_win_pct: 0.34, away_win_pct: 0.24 },
    { id: "empoli",      name: "Empoli",             short: "EMP", form: [0,1,1,0,0], goals_scored_avg: 1.0, goals_conceded_avg: 1.5, home_win_pct: 0.36, away_win_pct: 0.26 },
    { id: "fiorentina",  name: "Fiorentina",         short: "FIO", form: [1,1,0,1,1], goals_scored_avg: 1.8, goals_conceded_avg: 1.2, home_win_pct: 0.56, away_win_pct: 0.40 },
    { id: "genoa",       name: "Genoa",              short: "GEN", form: [0,0,0,1,0], goals_scored_avg: 0.9, goals_conceded_avg: 1.9, home_win_pct: 0.30, away_win_pct: 0.20 },
    { id: "hellas",      name: "Hellas Verona",      short: "HEL", form: [0,0,1,0,0], goals_scored_avg: 1.0, goals_conceded_avg: 1.8, home_win_pct: 0.32, away_win_pct: 0.22 },
    { id: "inter",       name: "Inter",              short: "INT", form: [1,1,1,1,1], goals_scored_avg: 2.6, goals_conceded_avg: 0.7, home_win_pct: 0.78, away_win_pct: 0.60 },
    { id: "juventus",    name: "Juventus",           short: "JUV", form: [1,0,1,1,0], goals_scored_avg: 1.7, goals_conceded_avg: 0.9, home_win_pct: 0.62, away_win_pct: 0.46 },
    { id: "lazio",       name: "Lazio",              short: "LAZ", form: [1,1,0,1,1], goals_scored_avg: 1.9, goals_conceded_avg: 1.1, home_win_pct: 0.60, away_win_pct: 0.42 },
    { id: "lecce",       name: "Lecce",              short: "LEC", form: [0,0,0,1,0], goals_scored_avg: 0.8, goals_conceded_avg: 2.0, home_win_pct: 0.28, away_win_pct: 0.18 },
    { id: "milan",       name: "AC Milan",           short: "MIL", form: [1,1,0,1,1], goals_scored_avg: 2.0, goals_conceded_avg: 1.0, home_win_pct: 0.66, away_win_pct: 0.48 },
    { id: "monza",       name: "Monza",              short: "MON", form: [0,1,0,0,1], goals_scored_avg: 1.1, goals_conceded_avg: 1.6, home_win_pct: 0.36, away_win_pct: 0.26 },
    { id: "napoli",      name: "Napoli",             short: "NAP", form: [1,1,1,0,1], goals_scored_avg: 2.2, goals_conceded_avg: 0.9, home_win_pct: 0.70, away_win_pct: 0.52 },
    { id: "parma",       name: "Parma",              short: "PAR", form: [0,1,0,1,0], goals_scored_avg: 1.2, goals_conceded_avg: 1.7, home_win_pct: 0.38, away_win_pct: 0.28 },
    { id: "roma",        name: "AS Roma",            short: "ROM", form: [1,0,1,1,0], goals_scored_avg: 1.8, goals_conceded_avg: 1.2, home_win_pct: 0.58, away_win_pct: 0.40 },
    { id: "torino",      name: "Torino",             short: "TOR", form: [0,1,1,0,1], goals_scored_avg: 1.3, goals_conceded_avg: 1.4, home_win_pct: 0.44, away_win_pct: 0.30 },
    { id: "udinese",     name: "Udinese",            short: "UDI", form: [1,0,0,1,0], goals_scored_avg: 1.2, goals_conceded_avg: 1.5, home_win_pct: 0.40, away_win_pct: 0.28 },
    { id: "venezia",     name: "Venezia",            short: "VEN", form: [0,0,1,0,0], goals_scored_avg: 0.9, goals_conceded_avg: 1.9, home_win_pct: 0.30, away_win_pct: 0.20 }
  ],

  "Premier League": [
    { id: "arsenal",      name: "Arsenal",           short: "ARS", form: [1,1,1,0,1], goals_scored_avg: 2.3, goals_conceded_avg: 0.8, home_win_pct: 0.74, away_win_pct: 0.56 },
    { id: "astonvilla",   name: "Aston Villa",       short: "AVL", form: [1,1,0,1,1], goals_scored_avg: 2.0, goals_conceded_avg: 1.1, home_win_pct: 0.62, away_win_pct: 0.44 },
    { id: "brentford",    name: "Brentford",         short: "BRE", form: [0,1,1,0,1], goals_scored_avg: 1.5, goals_conceded_avg: 1.4, home_win_pct: 0.50, away_win_pct: 0.34 },
    { id: "brighton",     name: "Brighton",          short: "BHA", form: [1,0,1,1,0], goals_scored_avg: 1.7, goals_conceded_avg: 1.2, home_win_pct: 0.54, away_win_pct: 0.38 },
    { id: "chelsea",      name: "Chelsea",           short: "CHE", form: [1,1,0,1,1], goals_scored_avg: 2.1, goals_conceded_avg: 1.0, home_win_pct: 0.64, away_win_pct: 0.46 },
    { id: "crystalpalace",name: "Crystal Palace",    short: "CRY", form: [0,1,0,0,1], goals_scored_avg: 1.1, goals_conceded_avg: 1.5, home_win_pct: 0.40, away_win_pct: 0.28 },
    { id: "everton",      name: "Everton",           short: "EVE", form: [0,0,1,0,0], goals_scored_avg: 1.0, goals_conceded_avg: 1.7, home_win_pct: 0.36, away_win_pct: 0.24 },
    { id: "fulham",       name: "Fulham",            short: "FUL", form: [1,0,1,0,1], goals_scored_avg: 1.4, goals_conceded_avg: 1.3, home_win_pct: 0.48, away_win_pct: 0.32 },
    { id: "ipswich",      name: "Ipswich Town",      short: "IPS", form: [0,0,0,1,0], goals_scored_avg: 0.9, goals_conceded_avg: 1.9, home_win_pct: 0.30, away_win_pct: 0.20 },
    { id: "leicester",    name: "Leicester City",    short: "LEI", form: [0,1,0,0,0], goals_scored_avg: 1.0, goals_conceded_avg: 1.8, home_win_pct: 0.32, away_win_pct: 0.22 },
    { id: "liverpool",    name: "Liverpool",         short: "LIV", form: [1,1,1,1,1], goals_scored_avg: 2.8, goals_conceded_avg: 0.6, home_win_pct: 0.82, away_win_pct: 0.64 },
    { id: "mancity",      name: "Manchester City",   short: "MCI", form: [1,1,0,1,1], goals_scored_avg: 2.5, goals_conceded_avg: 0.8, home_win_pct: 0.76, away_win_pct: 0.58 },
    { id: "manutd",       name: "Manchester United", short: "MUN", form: [0,1,0,1,0], goals_scored_avg: 1.3, goals_conceded_avg: 1.5, home_win_pct: 0.46, away_win_pct: 0.30 },
    { id: "newcastle",    name: "Newcastle United",  short: "NEW", form: [1,1,1,0,1], goals_scored_avg: 1.9, goals_conceded_avg: 1.0, home_win_pct: 0.64, away_win_pct: 0.46 },
    { id: "nottmforest",  name: "Nottingham Forest", short: "NFO", form: [1,0,1,1,0], goals_scored_avg: 1.5, goals_conceded_avg: 1.2, home_win_pct: 0.54, away_win_pct: 0.36 },
    { id: "southampton",  name: "Southampton",       short: "SOU", form: [0,0,0,0,1], goals_scored_avg: 0.8, goals_conceded_avg: 2.1, home_win_pct: 0.28, away_win_pct: 0.18 },
    { id: "spurs",        name: "Tottenham Hotspur", short: "TOT", form: [1,0,1,0,1], goals_scored_avg: 1.7, goals_conceded_avg: 1.3, home_win_pct: 0.54, away_win_pct: 0.38 },
    { id: "westham",      name: "West Ham United",   short: "WHU", form: [0,1,0,1,0], goals_scored_avg: 1.3, goals_conceded_avg: 1.5, home_win_pct: 0.44, away_win_pct: 0.30 },
    { id: "wolves",       name: "Wolverhampton",     short: "WOL", form: [0,0,1,0,0], goals_scored_avg: 1.0, goals_conceded_avg: 1.7, home_win_pct: 0.36, away_win_pct: 0.24 },
    { id: "bournemouth",  name: "Bournemouth",       short: "BOU", form: [1,1,0,1,1], goals_scored_avg: 1.8, goals_conceded_avg: 1.2, home_win_pct: 0.56, away_win_pct: 0.40 }
  ],

  "La Liga": [
    { id: "alaves",       name: "Alavés",            short: "ALA", form: [0,0,1,0,0], goals_scored_avg: 0.9, goals_conceded_avg: 1.8, home_win_pct: 0.32, away_win_pct: 0.22 },
    { id: "atletico",     name: "Atlético Madrid",   short: "ATM", form: [1,1,1,0,1], goals_scored_avg: 2.0, goals_conceded_avg: 0.7, home_win_pct: 0.70, away_win_pct: 0.52 },
    { id: "barcelona",    name: "FC Barcelona",      short: "BAR", form: [1,1,1,1,0], goals_scored_avg: 2.7, goals_conceded_avg: 0.8, home_win_pct: 0.78, away_win_pct: 0.60 },
    { id: "betis",        name: "Real Betis",        short: "BET", form: [1,0,1,1,0], goals_scored_avg: 1.5, goals_conceded_avg: 1.2, home_win_pct: 0.52, away_win_pct: 0.36 },
    { id: "celta",        name: "Celta Vigo",        short: "CEL", form: [0,1,0,1,0], goals_scored_avg: 1.2, goals_conceded_avg: 1.6, home_win_pct: 0.42, away_win_pct: 0.28 },
    { id: "espanyol",     name: "Espanyol",          short: "ESP", form: [0,0,1,0,0], goals_scored_avg: 0.9, goals_conceded_avg: 1.8, home_win_pct: 0.32, away_win_pct: 0.22 },
    { id: "getafe",       name: "Getafe",            short: "GET", form: [0,1,0,0,1], goals_scored_avg: 1.0, goals_conceded_avg: 1.5, home_win_pct: 0.38, away_win_pct: 0.26 },
    { id: "girona",       name: "Girona",            short: "GIR", form: [1,0,1,1,0], goals_scored_avg: 1.8, goals_conceded_avg: 1.3, home_win_pct: 0.56, away_win_pct: 0.38 },
    { id: "laspalmas",    name: "Las Palmas",        short: "LPA", form: [0,0,0,1,0], goals_scored_avg: 0.9, goals_conceded_avg: 1.9, home_win_pct: 0.30, away_win_pct: 0.20 },
    { id: "leganes",      name: "Leganés",           short: "LEG", form: [0,1,0,0,0], goals_scored_avg: 0.8, goals_conceded_avg: 1.9, home_win_pct: 0.28, away_win_pct: 0.18 },
    { id: "mallorca",     name: "Mallorca",          short: "MAL", form: [0,1,1,0,0], goals_scored_avg: 1.0, goals_conceded_avg: 1.5, home_win_pct: 0.38, away_win_pct: 0.26 },
    { id: "osasuna",      name: "Osasuna",           short: "OSA", form: [1,0,0,1,0], goals_scored_avg: 1.1, goals_conceded_avg: 1.4, home_win_pct: 0.42, away_win_pct: 0.28 },
    { id: "realmadrid",   name: "Real Madrid",       short: "RMA", form: [1,1,1,1,1], goals_scored_avg: 2.9, goals_conceded_avg: 0.7, home_win_pct: 0.82, away_win_pct: 0.66 },
    { id: "realsociedad", name: "Real Sociedad",     short: "RSO", form: [1,1,0,1,0], goals_scored_avg: 1.6, goals_conceded_avg: 1.1, home_win_pct: 0.56, away_win_pct: 0.38 },
    { id: "rayo",         name: "Rayo Vallecano",    short: "RAY", form: [0,1,0,0,1], goals_scored_avg: 1.1, goals_conceded_avg: 1.5, home_win_pct: 0.40, away_win_pct: 0.26 },
    { id: "sevilla",      name: "Sevilla",           short: "SEV", form: [0,1,1,0,1], goals_scored_avg: 1.4, goals_conceded_avg: 1.3, home_win_pct: 0.50, away_win_pct: 0.34 },
    { id: "valencia",     name: "Valencia",          short: "VAL", form: [0,0,1,0,0], goals_scored_avg: 1.0, goals_conceded_avg: 1.7, home_win_pct: 0.36, away_win_pct: 0.24 },
    { id: "villarreal",   name: "Villarreal",        short: "VIL", form: [1,1,0,1,1], goals_scored_avg: 1.9, goals_conceded_avg: 1.1, home_win_pct: 0.60, away_win_pct: 0.42 },
    { id: "valladolid",   name: "Real Valladolid",   short: "VLD", form: [0,0,0,0,1], goals_scored_avg: 0.7, goals_conceded_avg: 2.0, home_win_pct: 0.26, away_win_pct: 0.16 },
    { id: "athletic",     name: "Athletic Club",     short: "ATH", form: [1,1,0,0,1], goals_scored_avg: 1.5, goals_conceded_avg: 1.2, home_win_pct: 0.54, away_win_pct: 0.36 }
  ],

  "Champions League": [
    { id: "cl_inter",        name: "Inter (CL)",              short: "INT", form: [1,1,1,1,0], goals_scored_avg: 2.2, goals_conceded_avg: 0.8, home_win_pct: 0.72, away_win_pct: 0.54 },
    { id: "cl_realmadrid",   name: "Real Madrid (CL)",        short: "RMA", form: [1,1,1,1,1], goals_scored_avg: 2.6, goals_conceded_avg: 0.9, home_win_pct: 0.78, away_win_pct: 0.62 },
    { id: "cl_barcelona",    name: "FC Barcelona (CL)",       short: "BAR", form: [1,1,0,1,1], goals_scored_avg: 2.4, goals_conceded_avg: 0.9, home_win_pct: 0.74, away_win_pct: 0.56 },
    { id: "cl_mancity",      name: "Manchester City (CL)",    short: "MCI", form: [1,0,1,1,1], goals_scored_avg: 2.3, goals_conceded_avg: 0.9, home_win_pct: 0.72, away_win_pct: 0.56 },
    { id: "cl_liverpool",    name: "Liverpool (CL)",          short: "LIV", form: [1,1,1,0,1], goals_scored_avg: 2.5, goals_conceded_avg: 0.8, home_win_pct: 0.76, away_win_pct: 0.58 },
    { id: "cl_bayernmunich", name: "Bayern Monaco (CL)",      short: "BAY", form: [1,1,1,1,0], goals_scored_avg: 2.8, goals_conceded_avg: 1.0, home_win_pct: 0.80, away_win_pct: 0.62 },
    { id: "cl_psg",          name: "Paris Saint-Germain (CL)",short: "PSG", form: [1,1,0,1,1], goals_scored_avg: 2.3, goals_conceded_avg: 0.9, home_win_pct: 0.74, away_win_pct: 0.56 },
    { id: "cl_dortmund",     name: "Borussia Dortmund (CL)",  short: "BVB", form: [1,0,1,1,0], goals_scored_avg: 2.0, goals_conceded_avg: 1.2, home_win_pct: 0.66, away_win_pct: 0.48 },
    { id: "cl_atletico",     name: "Atlético Madrid (CL)",    short: "ATM", form: [1,1,0,0,1], goals_scored_avg: 1.8, goals_conceded_avg: 0.8, home_win_pct: 0.68, away_win_pct: 0.50 },
    { id: "cl_arsenal",      name: "Arsenal (CL)",            short: "ARS", form: [1,1,1,0,1], goals_scored_avg: 2.1, goals_conceded_avg: 0.9, home_win_pct: 0.70, away_win_pct: 0.52 },
    { id: "cl_juventus",     name: "Juventus (CL)",           short: "JUV", form: [1,0,1,0,1], goals_scored_avg: 1.7, goals_conceded_avg: 1.0, home_win_pct: 0.62, away_win_pct: 0.44 },
    { id: "cl_milan",        name: "AC Milan (CL)",           short: "MIL", form: [0,1,1,0,1], goals_scored_avg: 1.6, goals_conceded_avg: 1.1, home_win_pct: 0.58, away_win_pct: 0.40 },
    { id: "cl_chelsea",      name: "Chelsea (CL)",            short: "CHE", form: [1,0,1,1,0], goals_scored_avg: 1.9, goals_conceded_avg: 1.1, home_win_pct: 0.62, away_win_pct: 0.44 },
    { id: "cl_porto",        name: "FC Porto (CL)",           short: "POR", form: [1,1,0,1,0], goals_scored_avg: 1.8, goals_conceded_avg: 1.1, home_win_pct: 0.64, away_win_pct: 0.46 },
    { id: "cl_benfica",      name: "Benfica (CL)",            short: "BEN", form: [1,0,1,1,1], goals_scored_avg: 2.0, goals_conceded_avg: 1.0, home_win_pct: 0.66, away_win_pct: 0.48 },
    { id: "cl_rb_salzburg",  name: "RB Salzburg (CL)",        short: "SAL", form: [0,1,1,0,0], goals_scored_avg: 1.5, goals_conceded_avg: 1.4, home_win_pct: 0.52, away_win_pct: 0.34 }
  ]
};

// Tipo scommesse con fattori statistici
const BET_TYPES = [
  { value: "1x2_1",    label: "1X2 — Vittoria Casa",     factor: (h,a) => h.home_win_pct },
  { value: "1x2_x",    label: "1X2 — Pareggio",          factor: (h,a) => 0.28 - Math.abs(h.home_win_pct - a.away_win_pct) * 0.2 },
  { value: "1x2_2",    label: "1X2 — Vittoria Ospite",   factor: (h,a) => a.away_win_pct },
  { value: "over25",   label: "Over 2.5 Gol",            factor: (h,a) => Math.min(0.92, (h.goals_scored_avg + a.goals_scored_avg) / 5.5) },
  { value: "under25",  label: "Under 2.5 Gol",           factor: (h,a) => Math.max(0.25, 1 - (h.goals_scored_avg + a.goals_scored_avg) / 5.5) },
  { value: "gg",       label: "Goal / Goal",             factor: (h,a) => Math.min(0.88, (h.goals_scored_avg * 0.3 + a.goals_scored_avg * 0.3 + 0.2)) },
  { value: "ng",       label: "No Goal",                 factor: (h,a) => Math.max(0.20, 1 - (h.goals_scored_avg * 0.3 + a.goals_scored_avg * 0.3 + 0.2)) },
  { value: "over15",   label: "Over 1.5 Gol",            factor: (h,a) => Math.min(0.94, (h.goals_scored_avg + a.goals_scored_avg) / 4.2) },
  { value: "dc_1x",    label: "Doppia Chance 1X",        factor: (h,a) => Math.min(0.90, h.home_win_pct + 0.22) },
  { value: "dc_x2",    label: "Doppia Chance X2",        factor: (h,a) => Math.min(0.88, a.away_win_pct + 0.22) },
  { value: "hcp_h",    label: "Handicap Casa -1",        factor: (h,a) => Math.max(0.20, h.home_win_pct - 0.15) },
  { value: "btts_no",  label: "Under 3.5 Gol",           factor: (h,a) => Math.min(0.88, 0.70 - (h.goals_scored_avg + a.goals_scored_avg - 2.5) * 0.1) }
];

// Calcola probabilità realistica tra due squadre
function calculateProbability(homeTeam, awayTeam, betTypeValue) {
  const bt = BET_TYPES.find(b => b.value === betTypeValue);
  if (!bt || !homeTeam || !awayTeam) return 0.50;
  let prob = bt.factor(homeTeam, awayTeam);
  // Aggiusta per forma recente
  const homeFormScore = homeTeam.form.reduce((a,b) => a+b, 0) / homeTeam.form.length;
  const awayFormScore = awayTeam.form.reduce((a,b) => a+b, 0) / awayTeam.form.length;
  if (betTypeValue === '1x2_1') prob += (homeFormScore - 0.5) * 0.08;
  if (betTypeValue === '1x2_2') prob += (awayFormScore - 0.5) * 0.08;
  return Math.min(0.95, Math.max(0.10, prob));
}
