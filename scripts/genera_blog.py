
import html
import json
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

URL = "https://www.betstorm.it/api/football?type=matches&code=SA"
ROME = ZoneInfo("Europe/Rome")
OUTPUT = Path("bozze/bozza-serie-a.html")


def esc(value):
    return html.escape(str(value), quote=True)


def load_matches():
    request = urllib.request.Request(
        URL,
        headers={"User-Agent": "BetStorm-SEO-Blog/1.0"}
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.load(response)

    if payload.get("source") != "football-data.org":
        raise RuntimeError("Fonte dati non riconosciuta")

    matches = payload.get("data", {}).get("matches")

    if not isinstance(matches, list):
        raise RuntimeError("Elenco partite non valido")

    return matches


def upcoming_matches(matches):
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=7)
    selected = []

    for match in matches:
        if match.get("status") not in ("SCHEDULED", "TIMED"):
            continue

        try:
            when = datetime.fromisoformat(
                match["utcDate"].replace("Z", "+00:00")
            )
        except (KeyError, ValueError, TypeError):
            continue

        home = match.get("homeTeam") or {}
        away = match.get("awayTeam") or {}

        if not home.get("name") or not away.get("name"):
            continue

        if now <= when < end:
            selected.append({
                "when": when,
                "home": home["name"],
                "away": away["name"]
            })

    return sorted(selected, key=lambda item: item["when"])


def format_date(when):
    return when.astimezone(ROME).strftime("%d/%m/%Y alle %H:%M")


def create_article(matches):
    today = datetime.now(ROME)
    start = today.strftime("%d/%m/%Y")
    end = (today + timedelta(days=7)).strftime("%d/%m/%Y")

    title = f"Serie A: calendario e partite dal {start} | BetStorm"
    description = (
        f"Scopri le partite di Serie A in programma dal "
        f"{start} al {end}: calendario, squadre e orari italiani."
    )

    if not matches:
        raise RuntimeError(
            "Nessuna partita futura disponibile: "
            "bozza non generata per evitare contenuti vuoti."
        )

    rows = []
    for match in matches:
        rows.append(
            "<tr>"
            f"<td>{esc(format_date(match['when']))}</td>"
            f"<td>{esc(match['home'])}</td>"
            f"<td>{esc(match['away'])}</td>"
            "</tr>"
        )

    highlights = []
    for match in matches[:3]:
        highlights.append(
            "<li>"
            f"<strong>{esc(match['home'])} – "
            f"{esc(match['away'])}</strong>: "
            f"incontro programmato per il "
            f"{esc(format_date(match['when']))} "
            "(ora italiana)."
            "</li>"
        )

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
  max-width:920px;
  margin:auto;
  padding:22px;
}}
header {{
  border-bottom:1px solid var(--line);
}}
a {{ color:var(--green); }}
.brand {{
  color:var(--text);
  text-decoration:none;
  font-weight:800;
  font-size:1.3rem;
}}
article {{
  margin:32px 0;
  background:var(--card);
  border:1px solid var(--line);
  border-radius:22px;
  padding:clamp(20px,5vw,45px);
}}
h1 {{ line-height:1.2; }}
h2 {{ margin-top:35px; }}
p,li {{ color:#d6deea; }}
.intro {{ color:var(--muted);font-size:1.1rem; }}
.table-wrap {{ overflow-x:auto; }}
table {{
  width:100%;
  border-collapse:collapse;
  margin-top:20px;
}}
th,td {{
  padding:12px;
  border-bottom:1px solid var(--line);
  text-align:left;
}}
th {{ color:var(--green); }}
.notice {{
  margin-top:35px;
  border-top:1px solid var(--line);
  padding-top:20px;
  color:var(--muted);
  font-size:.9rem;
}}
footer {{
  color:var(--muted);
  border-top:1px solid var(--line);
}}
</style>
</head>
<body>
<header>
<a class="brand" href="https://www.betstorm.it">BETSTORM</a>
<nav><a href="https://www.betstorm.it/blog.html">Blog</a></nav>
</header>
<main>
<article>
<p style="color:var(--green)">BOZZA EDITORIALE</p>

<h1>{esc(title)}</h1>

<p class="intro">{esc(description)}</p>

<p>
La Serie A prosegue con nuovi incontri in calendario.
In questa guida BetStorm raccoglie le partite
programmate nei prossimi sette giorni,
con le squadre coinvolte e gli orari italiani.
</p>

<h2>Calendario Serie A della settimana</h2>

<p>
Secondo i dati disponibili al
{esc(today.strftime("%d/%m/%Y"))},
sono presenti <strong>{len(matches)} incontri</strong>
programmati nel periodo considerato.
</p>

<div class="table-wrap">
<table>
<thead>
<tr>
<th>Data e ora</th>
<th>Squadra di casa</th>
<th>Squadra ospite</th>
</tr>
</thead>
<tbody>
{chr(10).join(rows)}
</tbody>
</table>
</div>

<h2>Le prime partite in programma</h2>

<p>
Ecco i primi tre incontri in ordine cronologico
tra quelli presenti nel calendario.
La selezione non rappresenta una classifica
di importanza né un pronostico.
</p>

<ul>
{chr(10).join(highlights)}
</ul>

<h2>Come consultare il calendario</h2>

<p>
Tutti gli orari sono indicati nel fuso italiano.
Date e orari possono essere modificati
dagli organizzatori delle competizioni.
Prima di seguire un incontro è consigliabile
verificare eventuali aggiornamenti.
</p>

<h2>Domande frequenti</h2>

<h3>Quali partite di Serie A sono previste questa settimana?</h3>
<p>
La tabella riporta gli incontri programmati
nei prossimi sette giorni secondo i dati
disponibili al momento della generazione.
</p>

<h3>Gli orari delle partite sono italiani?</h3>
<p>
Sì. Gli orari sono convertiti nel fuso
Europe/Rome, compresi i cambi tra ora
solare e ora legale.
</p>

<h3>Dove trovare altri contenuti BetStorm?</h3>
<p>
Puoi consultare il
<a href="https://www.betstorm.it/blog.html">blog BetStorm</a>
per leggere altri approfondimenti sportivi.
</p>

<div class="notice">
Fonte: football-data.org tramite API BetStorm.
Dati consultati il {esc(today.strftime("%d/%m/%Y"))}.
Questo articolo non contiene quote o
probabilità di vincita.
</div>

</article>
</main>
<footer>© BetStorm</footer>
</body>
</html>"""

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(article, encoding="utf-8")

    print(f"Bozza creata: {OUTPUT}")
    print(f"Partite incluse: {len(matches)}")
    print("Nessun articolo pubblicato.")


def main():
    matches = load_matches()
    selected = upcoming_matches(matches)
    create_article(selected)


if __name__ == "__main__":
    main()
