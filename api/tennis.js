// BetStorm - api/tennis.js - AcesAPI proxy for Vercel
// Requires ACESAPI_API_KEY in Vercel Environment Variables.
// Uses documented get_matches parameters: season, limit.
// Note: this endpoint's date coverage and WTA support must be verified.
const ENDPOINT = 'https://mcp.acesapi.com/v1/get_matches';
const validDate = /^\d{4}-\d{2}-\d{2}$/;
const clean = v => v == null ? '' : String(v).slice(0, 240);

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({error:'Metodo non consentito'});
  }
  const key = process.env.ACESAPI_API_KEY;
  if (!key) return res.status(503).json({error:'ACESAPI_API_KEY non configurata su Vercel'});
  const date = typeof req.query.date === 'string' ? req.query.date : '';
  const tour = typeof req.query.tour === 'string' ? req.query.tour.toLowerCase() : 'all';
  if (!validDate.test(date) || !Number.isFinite(Date.parse(date+'T00:00:00Z')) || new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)
    return res.status(400).json({error:'Data non valida'});
  if (!['all','atp','wta'].includes(tour)) return res.status(400).json({error:'Circuito non valido'});
  const season = Number(date.slice(0,4));
  try {
    const upstream = await fetch(ENDPOINT, {
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':key,'Accept':'application/json'},
      body:JSON.stringify({season,limit:100}),
      signal:AbortSignal.timeout(9000)
    });
    if (upstream.status===429) return res.status(429).json({error:'Limite AcesAPI raggiunto'});
    if (!upstream.ok) return res.status(502).json({error:'AcesAPI non disponibile (HTTP '+upstream.status+')'});
    const data = await upstream.json();
    if (!data || !Array.isArray(data.matches)) return res.status(502).json({error:'Formato AcesAPI inatteso'});
    const matches = data.matches.filter(m => {
      if (!m || typeof m !== 'object' || !m.player1 || !m.player2) return false;
      if (m.match_date !== date) return false;
      const mtour = clean(m.tour || data.tour).toLowerCase();
      return tour==='all' || mtour===tour;
    }).map(m=>({
      id:clean(m.match_id),tour:clean(m.tour||data.tour),
      tournament:clean(m.tournament),round:clean(m.round),
      player1:clean(m.player1),player2:clean(m.player2),
      player1Country:clean(m.player1_country),player2Country:clean(m.player2_country),
      startTime:clean(m.starts_at),status:clean(m.status),
      outcome:clean(m.outcome),score:clean(m.score),
      surface:clean(m.surface),winnerId:clean(m.winner_id),
      sets:Array.isArray(m.sets)?m.sets.slice(0,5).map(s=>({
        set:s.set_no,games1:s.games1,games2:s.games2,
        tiebreak1:s.tiebreak1,tiebreak2:s.tiebreak2
      })):[]
    }));
    res.setHeader('Cache-Control','public, s-maxage=900, stale-while-revalidate=1800');
    return res.status(200).json({source:'AcesAPI',fetched_at:new Date().toISOString(),matches,
      note:'Risultati limitati ai primi 100 incontri restituiti dalla fonte per la stagione; assenza di incontri non significa calendario completo.'});
  } catch (_) {
    return res.status(504).json({error:'Richiesta AcesAPI scaduta o non riuscita'});
  }
};
