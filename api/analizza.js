// api/analizza.js — BetStorm Storm Analysis
// CommonJS / Vercel

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  'BetStorm <newsletter@betstorm.it>';

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function esc(s = '') {
  return String(s).replace(
    /[&<>\"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '\"': '&quot;',
      "'": '&#39;'
    }[c])
  );
}

function pct(n) {
  return `${(n * 100).toFixed(1).replace('.', ',')}%`;
}

function analysePick(p, i) {
  const home = String(p.home || p.event || '').trim();
  const away = String(p.away || '').trim();
  const bet = String(p.bet || p.pick || '').trim();
  const quota = Number.parseFloat(p.quota);

  if (
    !home ||
    !bet ||
    !Number.isFinite(quota) ||
    quota <= 1
  ) {
    return null;
  }

  // Probabilità implicita grezza della quota.
  // Non viene presentata come probabilità reale.
  const implied = clamp(1 / quota, 0.001, 0.999);

  return {
    index: i + 1,
    event: away ? `${home} - ${away}` : home,
    bet,
    quota,
    implied,
    estimate: implied,
    basis: 'Probabilità implicita della quota inserita'
  };
}

function riskLabel(p) {
  if (p >= 0.35) return 'MEDIO';
  if (p >= 0.15) return 'ALTO';
  return 'MOLTO ALTO';
}

function buildAnalysis(picks) {
  const rows = picks
    .map(analysePick)
    .filter(Boolean);

  if (!rows.length) {
    throw new Error(
      'Nessun pick valido. Inserisci evento, pronostico e quota maggiore di 1.'
    );
  }

  const totalOdds = rows.reduce(
    (a, p) => a * p.quota,
    1
  );

  const combined = rows.reduce(
    (a, p) => a * p.estimate,
    1
  );

  const weakest = [...rows].sort(
    (a, b) => a.estimate - b.estimate
  )[0];

  const strongest = [...rows].sort(
    (a, b) => b.estimate - a.estimate
  )[0];

  const withoutWeakest =
    rows.length > 1
      ? rows
          .filter(p => p.index !== weakest.index)
          .reduce((a, p) => a * p.estimate, 1)
      : null;

  const oddsWithoutWeakest =
    rows.length > 1
      ? rows
          .filter(p => p.index !== weakest.index)
          .reduce((a, p) => a * p.quota, 1)
      : null;

  return {
    rows,
    totalOdds,
    combined,
    weakest,
    strongest,
    withoutWeakest,
    oddsWithoutWeakest,
    risk: riskLabel(combined)
  };
}

function emailHtml(a) {
  const rows = a.rows
    .map(
      p => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #26313b">
          ${esc(p.event)}
        </td>
        <td style="padding:8px;border-bottom:1px solid #26313b">
          ${esc(p.bet)}
        </td>
        <td style="padding:8px;border-bottom:1px solid #26313b">
          ${p.quota.toFixed(2)}
        </td>
        <td style="padding:8px;border-bottom:1px solid #26313b">
          ${pct(p.estimate)}
        </td>
      </tr>`
    )
    .join('');

  const improvement =
    a.withoutWeakest == null
      ? 'Con un solo pick non è possibile simulare la rimozione della selezione più rischiosa.'
      : `
        Rimuovendo
        <strong>
          ${esc(a.weakest.event)} —
          ${esc(a.weakest.bet)}
        </strong>,
        la quota teorica scende a
        <strong>${a.oddsWithoutWeakest.toFixed(2)}</strong>
        e la probabilità implicita combinata sale a
        <strong>${pct(a.withoutWeakest)}</strong>.
      `;

  return `
  <!doctype html>

  <html>
  <body style="
    margin:0;
    background:#071016;
    color:#eaf2f7;
    font-family:Arial,sans-serif;
  ">

  <div style="
    max-width:680px;
    margin:auto;
    padding:28px;
  ">

    <h1 style="color:#00e887">
      Storm Analysis
    </h1>

    <p>
      Analisi della schedina basata sui dati inseriti.
    </p>

    <div style="
      background:#111a21;
      padding:18px;
      border-radius:12px;
    ">

      <p>
        <strong>Selezioni:</strong>
        ${a.rows.length}
      </p>

      <p>
        <strong>Quota totale:</strong>
        ${a.totalOdds.toFixed(2)}
      </p>

      <p>
        <strong>Probabilità implicita combinata:</strong>
        ${pct(a.combined)}
      </p>

      <p>
        <strong>Profilo di rischio:</strong>
        ${a.risk}
      </p>

    </div>

    <h2>Analisi pick per pick</h2>

    <table style="
      width:100%;
      border-collapse:collapse;
      color:#eaf2f7;
    ">

      <thead>
        <tr>
          <th align="left">Evento</th>
          <th align="left">Pick</th>
          <th align="left">Quota</th>
          <th align="left">Prob. implicita*</th>
        </tr>
      </thead>

      <tbody>
        ${rows}
      </tbody>

    </table>

    <h2>Pick più solido</h2>

    <p>
      ${esc(a.strongest.event)} —
      ${esc(a.strongest.bet)}
      (${pct(a.strongest.estimate)})
    </p>

    <h2>Pick più rischioso</h2>

    <p>
      ${esc(a.weakest.event)} —
      ${esc(a.weakest.bet)}
      (${pct(a.weakest.estimate)})
    </p>

    <h2>Come ridurre il rischio</h2>

    <p>
      ${improvement}
    </p>

    <p style="
      font-size:12px;
      color:#9ba9b4;
      margin-top:28px;
    ">
      * In questa versione la stima deriva dalla
      probabilità implicita della quota inserita (1/quota).
      Non è una previsione certa né una probabilità reale.
      Quote di eventi correlati non sono necessariamente
      indipendenti.

      Analisi a scopo informativo.
      18+ Gioca responsabilmente.
    </p>

  </div>

  </body>
  </html>
  `;
}

async function sendEmail(email, analysis) {
  if (!RESEND_API_KEY) {
    throw new Error(
      'RESEND_API_KEY non configurata'
    );
  }

  const r = await fetch(
    'https://api.resend.com/emails',
    {
      method: 'POST',

      headers: {
        Authorization:
          `Bearer ${RESEND_API_KEY}`,

        'Content-Type':
          'application/json'
      },

      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,

        to: [email],

        subject:
          `Storm Analysis — ${analysis.rows.length} selezioni`,

        html:
          emailHtml(analysis)
      })
    }
  );

  if (!r.ok) {
    const errorText =
      await r.text();

    throw new Error(
      `Invio email fallito (${r.status}): ${errorText.slice(0, 200)}`
    );
  }

  return r.json();
}
console.log('[analizza] BetStorm Analysis Engine v2');

module.exports = async function handler(req, res) {
  res.setHeader(
    'Access-Control-Allow-Origin',
    '*'
  );

  res.setHeader(
    'Access-Control-Allow-Methods',
    'POST, OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({
        error: 'Method not allowed'
      });
  }

  try {
    const {
      email,
      picks
    } = req.body || {};

    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        String(email)
      )
    ) {
      return res
        .status(400)
        .json({
          error: 'Email non valida'
        });
    }

    if (
      !Array.isArray(picks) ||
      !picks.length
    ) {
      return res
        .status(400)
        .json({
          error:
            'Inserisci almeno un pick. La foto verrà aggiunta nella fase successiva.'
        });
    }

    if (picks.length > 15) {
      return res
        .status(400)
        .json({
          error:
            'Massimo 15 pick per analisi'
        });
    }

    const analysis =
      buildAnalysis(picks);

    const sent =
      await sendEmail(
        String(email).trim(),
        analysis
      );

    return res
      .status(200)
      .json({

        status: 'success',

        email_sent: true,

        email_id:
          sent.id || null,

        analysis: {
          selections:
            analysis.rows.length,

          total_odds:
            Number(
              analysis.totalOdds.toFixed(2)
            ),

          estimated_probability:
            Number(
              (
                analysis.combined * 100
              ).toFixed(1)
            ),

          probability_label:
            'probabilità implicita combinata',

          risk:
            analysis.risk,

          strongest: {
            event:
              analysis.strongest.event,

            bet:
              analysis.strongest.bet,

            probability:
              Number(
                (
                  analysis.strongest.estimate *
                  100
                ).toFixed(1)
              )
          },

          weakest: {
            event:
              analysis.weakest.event,

            bet:
              analysis.weakest.bet,

            probability:
              Number(
                (
                  analysis.weakest.estimate *
                  100
                ).toFixed(1)
              )
          },

          improved_probability:
            analysis.withoutWeakest == null
              ? null
              : Number(
                  (
                    analysis.withoutWeakest *
                    100
                  ).toFixed(1)
                )
        },

        message:
          'Analisi completata. Il report è stato inviato via email.'
      });

  } catch (err) {
    console.error(
      '[analizza]',
      err.message
    );

    return res
      .status(500)
      .json({
        error:
          err.message ||
          'Errore interno'
      });
  }
};
