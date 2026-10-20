
import json
import html
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

URL = "https://www.betstorm.it/api/football?type=matches&code=SA"
ROMA = ZoneInfo("Europe/Rome")

def esc(value):
    return html.escape(str(value), quote=True)

def main():
    request = urllib.request.Request(
        URL, headers={"User-Agent": "BetStorm-SEO-Blog/1.0"}
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.load(response)

    if payload.get("source") != "football-data.org":
        raise RuntimeError("Fonte calcio non riconosciuta")

    matches = payload.get("data", {}).get("matches")
    if not isinstance(matches, list):
        raise RuntimeError("Elenco partite non valido")

    now = datetime.now(timezone.utc)
    end = now + timedelta(days=7)
    upcoming = []

    for match in matches:
        if match.get("status") not in ("SCHEDULED", "TIMED"):
            continue
        try:
            when = datetime.fromisoformat(
                match["utcDate"].replace("Z", "+00:00")
            )
        except (KeyError, ValueError, TypeError):
            continue
        if now <= when < end:
            upcoming.append((when, match))

    upcoming.sort(key=lambda item: item[0])

    today = now.astimezone(ROMA).strftime("%d/%m/%Y")
    title = f"Serie A: calendario della settimana dal {today} | BetStorm"

    rows = []
    for when, match in upcoming:
        local = when.astimezone(ROMA).strftime("%d/%m/%Y %H:%M")
        home = esc(match.get("homeTeam", {}).get("name", "Da definire"))
        away = esc(match.get("awayTeam", {}).get("name", "Da definire"))
        rows.append(
            f"<tr><td>{esc(local)}</td>"
            f"<td>{home}</td><td>{away}</td></tr>"
        )

    if not rows:
        content = (
            "<p>Non risultano incontri confermati di Serie A "
            "nei prossimi sette giorni nei dati disponibili.</p>"
        )
    else:
        content = (
            "<table><thead><tr><th>Data e ora italiana</th>"
            "<th>Casa</th><th>Trasferta</th></tr></thead>"
            "<tbody>" + "\n".join(rows) + "</tbody></table>"
        )

    page = f"""<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="Calendario Serie A dei prossimi sette giorni: partite e orari italiani, con dati aggiornati.">
<meta name="robots" content="noindex,nofollow">
<style>
body{{font-family:Arial,sans-serif;max-width:900px;margin:40px auto;
padding:20px;background:#070b10;color:#f5f7fb;line-height:1.7}}
a{{color:#00e57b}}
table{{width:100%;border-collapse:collapse}}
th,td{{border:1px solid #394454;padding:12px;text-align:left}}
</style>
</head>
<body>
<header><a href="https://www.betstorm.it">BETSTORM</a></header>
<main>
<article>
<h1>{esc(title)}</h1>
<p>Bozza editoriale non pubblicata.</p>
<p>Fonte: football-data.org tramite BetStorm.
Calendario verificato il {esc(today)}.</p>
<h2>Le partite dei prossimi sette giorni</h2>
{content}
<p>Gli orari possono subire variazioni.
Non sono riportate quote o probabilità non verificate.</p>
</article>
</main>
</body>
</html>"""

    output = Path("bozze")
    output.mkdir(exist_ok=True)
    filename = output / "bozza-serie-a.html"
    filename.write_text(page, encoding="utf-8")

    print(f"Bozza creata: {filename}")
    print(f"Partite future incluse: {len(upcoming)}")
    print("Nessun articolo pubblicato.")

if __name__ == "__main__":
    main()
