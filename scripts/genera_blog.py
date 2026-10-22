
import html
import json
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

BASE = "https://www.betstorm.it/api/football"
ROME = ZoneInfo("Europe/Rome")
OUTPUT = Path("bozze/bozza-serie-a.html")


def esc(value):
    return html.escape(str(value), quote=True)


def get_matches(params):
    query = urllib.parse.urlencode({
        "type": "matches",
        "code": "SA",
        **params
    })
    request = urllib.request.Request(
        BASE + "?" + query,
        headers={"User-Agent": "BetStorm-SEO-Blog/2.0"}
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.load(response)

    if payload.get("source") != "football-data.org":
        raise RuntimeError("Fonte calcio non riconosciuta")

    matches = payload.get("data", {}).get("matches")
    if not isinstance(matches, list):
        raise RuntimeError("Risposta calcio non valida")
    return matches


def parse_date(match):
    try:
        return datetime.fromisoformat(
            match["utcDate"].replace("Z", "+00:00")
        )
    except (KeyError, AttributeError, TypeError, ValueError):
        return None


def team_name(match, side):
    return (match.get(side) or {}).get("name") or ""


def team_id(match, side):
    return (match.get(side) or {}).get("id")


def scheduled(matches, now):
    end = now + timedelta(days=7)
    selected = []

    for match in matches:
        when = parse_date(match)
        if (
            match.get("status") in ("SCHEDULED", "TIMED")
            and when is not None
            and now <= when < end
            and team_name(match, "homeTeam")
            and team_name(match, "awayTeam")
        ):
            selected.append(match)

    return sorted(selected, key=parse_date)


def finished(matches, now):
    selected = []

    for match in matches:
        if match.get("status") != "FINISHED":
            continue

        when = parse_date(match)
        score = (match.get("score") or {}).get("fullTime") or {}

        if (
            when is None
            or when > now
            or type(score.get("home")) is not int
            or type(score.get("away")) is not int
            or team_id(match, "homeTeam") is None
            or team_id(match, "awayTeam") is None
        ):
            continue

        selected.append(match)

    return sorted(selected, key=parse_date, reverse=True)


def recent_games(team, history, before):
    games = []

    for match in history:
        if parse_date(match) >= before:
            continue

        if team in (
            team_id(match, "homeTeam"),
            team_id(match, "awayTeam")
        ):
            games.append(match)

        if len(games) == 5:
            break

    return games


def team_stats(team, games):
    stats = {
        "W": 0,
        "D": 0,
        "L": 0,
        "gf": 0,
        "ga": 0,
        "form": []
    }

    for match in games:
        is_home = team_id(match, "homeTeam") == team
        score = match["score"]["fullTime"]

        if is_home:
            gf, ga = score["home"], score["away"]
        else:
            gf, ga = score["away"], score["home"]

        outcome = "W" if gf > ga else "D" if gf == ga else "L"

        stats[outcome] += 1
        stats["gf"] += gf
        stats["ga"] += ga
        stats["form"].append((match, outcome))

    return stats


def date_it(when):
    return when.astimezone(ROME).strftime(
        "%d/%m/%Y alle %H:%M"
    )


def insight(name, stats, count):
    if count == 0:
        return (
            f"Per {esc(name)} non sono disponibili "
            "risultati precedenti sufficienti."
        )

    return (
        f"{esc(name)}: nelle ultime {count} gare disponibili, "
        f"{stats['W']} vittorie, "
        f"{stats['D']} pareggi, "
        f"{stats['L']} sconfitte. "
        f"Gol segnati: {stats['gf']}; "
        f"gol subiti: {stats['ga']}. "
        f"Differenza reti: {stats['gf'] - stats['ga']:+d}."
    )


def trend_html(stats):
    if not stats["form"]:
        return "<p>Risultati recenti non disponibili.</p>"

    rows = []

    for match, outcome in stats["form"]:
        score = match["score"]["fullTime"]
        when = parse_date(match).astimezone(ROME)
        label = {"W": "V", "D": "N", "L": "P"}[outcome]

        rows.append(
            "<li>"
            f"{esc(when.strftime('%d/%m/%Y'))}: "
            f"{esc(team_name(match, 'homeTeam'))} "
            f"{score['home']}–{score['away']} "
            f"{esc(team_name(match, 'awayTeam'))} "
            f"({label})"
            "</li>"
        )

    return "<ol>" + "".join(rows) + "</ol>"


def match_analysis(match, history):
    when = parse_date(match)
    home = team_name(match, "homeTeam")
    away = team_name(match, "awayTeam")

    home_games = recent_games(
        team_id(match, "homeTeam"), history, when
    )
    away_games = recent_games(
        team_id(match, "awayTeam"), history, when
    )

    hs = team_stats(team_id(match, "homeTeam"), home_games)
    aws = team_stats(team_id(match, "awayTeam"), away_games)

    if not home_games and not away_games:
        return (
            '<section class="match">'
            f"<h3>{esc(home)} – {esc(away)}</h3>"
            "<p>Nessun risultato storico utilizzabile: "
            "analisi non disponibile.</p></section>"
        )

    return f"""
<section class="match">
<h3>{esc(home)} – {esc(away)}</h3>
<p class="meta">{esc(date_it(when))} · Storm Match Center</p>

<div class="compare">
<div>
<h4>{esc(home)}</h4>
<p>{insight(home, hs, len(home_games))}</p>
</div>
<div>
<h4>{esc(away)}</h4>
<p>{insight(away, aws, len(away_games))}</p>
</div>
</div>

<h4>Storm Insights</h4>
<p>
Nelle gare precedenti disponibili,
{esc(home)} ha segnato {hs['gf']} gol
e ne ha subiti {hs['ga']}.
{esc(away)} ha segnato {aws['gf']} gol
e ne ha subiti {aws['ga']}.
I campioni possono avere dimensioni differenti:
questo confronto descrive i risultati passati
e non costituisce una previsione.
</p>

<h4>Storm Trends — risultati recenti</h4>
<div class="compare">
<div>
<h4>{esc(home)}</h4>
{trend_html(hs)}
</div>
<div>
<h4>{esc(away)}</h4>
{trend_html(aws)}
</div>
</div>
</section>
"""


def create_article(upcoming, history, now):
    if not upcoming:
        raise RuntimeError(
            "Nessuna partita nei prossimi sette giorni: "
            "bozza non generata."
        )

    today = now.astimezone(ROME)
    start = today.strftime("%d/%m/%Y")
    end = (now + timedelta(days=7)).astimezone(
        ROME
    ).strftime("%d/%m/%Y")

    title = (
        f"Serie A dal {start}: calendario e analisi Storm | BetStorm"
    )
    description = (
        f"Partite di Serie A dal {start} al {end}: "
        "orari, risultati recenti e analisi Storm Match Center."
    )

    rows = []
    for match in upcoming:
        rows.append(
            "<tr>"
            f"<td>{esc(date_it(parse_date(match)))}</td>"
            f"<td>{esc(team_name(match, 'homeTeam'))}</td>"
            f"<td>{esc(team_name(match, 'awayTeam'))}</td>"
            "</tr>"
        )

    analyses = [
        match_analysis(match, history)
        for match in upcoming[:3]
    ]

    article = f"""<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(description)}">
<meta name="robots" content="noindex,nofollow">
<style>
:root {{
  --bg:#070b10;
  --card:#0d1218;
  --text:#f5f7fb;
  --muted:#9eb0c8;
  --green:#00e57b;
  --line:#26303b;
}}
* {{ box-sizing:border-box; }}
body {{
  margin:0;
  background:var(--bg);
  color:var(--text);
  font-family:Arial,sans-serif;
  line-height:1.7;
}}
header,main,footer {{
  max-width:960px;
  margin:auto;
  padding:22px;
}}
header,footer {{
  border-bottom:1px solid var(--line);
}}
a {{ color:var(--green); }}
.brand {{
  font-weight:800;
  font-size:1.3rem;
  text-decoration:none;
}}
article {{
  margin:30px 0;
  background:var(--card);
  border:1px solid var(--line);
  border-radius:20px;
  padding:clamp(18px,4vw,42px);
}}
h1 {{ line-height:1.2; }}
h2 {{ margin-top:35px;color:var(--green); }}
h3 {{ margin-top:0; }}
p,li {{ color:#d6deea; }}
.meta,.notice {{
  color:var(--muted);
  font-size:.9rem;
}}
.table-wrap {{ overflow-x:auto; }}
table {{
  width:100%;
  min-width:560px;
  border-collapse:collapse;
}}
th,td {{
  padding:11px;
  border-bottom:1px solid var(--line);
  text-align:left;
}}
th {{ color:var(--green); }}
.match {{
  border:1px solid var(--line);
  border-radius:14px;
  padding:22px;
  margin:22px 0;
}}
.compare {{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:16px;
}}
.compare>div {{ min-width:0; }}
.compare li {{ font-size:.87rem; }}
.notice {{
  margin-top:35px;
  border-top:1px solid var(--line);
  padding-top:20px;
}}
@media(max-width:650px) {{
  .compare {{ grid-template-columns:1fr; }}
}}
</style>
</head>
<body>
<header>
<a class="brand" href="https://www.betstorm.it">BETSTORM</a>
<a href="https://www.betstorm.it/blog.html">Blog</a>
</header>

<main>
<article>
<p style="color:var(--green)">
BOZZA EDITORIALE · DA REVISIONARE
</p>

<h1>{esc(title)}</h1>
<p>{esc(description)}</p>

<p>
Le analisi Storm utilizzano risultati conclusi
restituiti da football-data.org tramite BetStorm.
Non sono pronostici.
</p>

<h2>Calendario Serie A: prossimi sette giorni</h2>
<p>
Alla data del {esc(start)} risultano
{len(upcoming)} incontri programmati.
</p>

<div class="table-wrap">
<table>
<thead>
<tr>
<th>Data e ora italiana</th>
<th>Casa</th>
<th>Trasferta</th>
</tr>
</thead>
<tbody>
{''.join(rows)}
</tbody>
</table>
</div>

<h2>Storm Match Center: analisi delle prime tre partite</h2>
<p>
Gli approfondimenti riguardano le prime tre partite
in ordine cronologico. Per ogni squadra sono utilizzati
al massimo cinque risultati precedenti disponibili
nella Serie A corrente.
</p>

{''.join(analyses)}

<h2>Metodo e limiti delle analisi Storm</h2>
<p>
Storm Insights confronta vittorie, pareggi, sconfitte,
gol segnati e subiti nelle gare disponibili.
La copertura dipende dalla fonte e non comprende
automaticamente altre competizioni.
Le statistiche non garantiscono risultati futuri.
</p>

<h2>Domande frequenti</h2>

<h3>Le analisi Storm sono pronostici?</h3>
<p>
No. Sono confronti descrittivi basati
su risultati sportivi verificabili.
</p>

<h3>Gli orari sono italiani?</h3>
<p>
Sì. Sono convertiti nel fuso Europe/Rome.
Date e orari possono subire variazioni.
</p>

<div class="notice">
Fonte: football-data.org tramite API BetStorm.
Dati consultati il
{esc(today.strftime('%d/%m/%Y alle %H:%M'))}.
Nessuna quota o probabilità di vincita.
</div>
</article>
</main>
<footer>© BetStorm</footer>
</body>
</html>"""

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(article, encoding="utf-8")

    print(f"Bozza creata: {OUTPUT}")
    print(f"Partite future: {len(upcoming)}")
    print(f"Risultati storici disponibili: {len(history)}")
    print("Nessun articolo pubblicato.")


def main():
    now = datetime.now(timezone.utc)

    future = get_matches({
        "dateFrom": now.date().isoformat(),
        "dateTo": (
            now + timedelta(days=8)
        ).date().isoformat()
    })

    past = get_matches({
        "status": "FINISHED",
        "dateFrom": (
            now - timedelta(days=100)
        ).date().isoformat(),
        "dateTo": now.date().isoformat()
    })

    create_article(
        scheduled(future, now),
        finished(past, now),
        now
    )


if __name__ == "__main__":
    main()
