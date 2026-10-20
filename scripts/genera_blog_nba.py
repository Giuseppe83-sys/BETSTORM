
import html
import json
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

URL = "https://www.betstorm.it/api/basket?type=games&season=2026"
ROME = ZoneInfo("Europe/Rome")
OUTPUT = Path("bozze/bozza-nba.html")


def esc(value):
    return html.escape(str(value), quote=True)


def fetch_games():
    request = urllib.request.Request(
        URL,
        headers={"User-Agent": "BetStorm-SEO-NBA/2.0"}
    )

    try:
        with urllib.request.urlopen(
            request, timeout=30
        ) as response:
            payload = json.load(response)

    except urllib.error.HTTPError as exc:
        if exc.code == 429:
            raise RuntimeError(
                "API NBA temporaneamente limitata (429). "
                "Riprovare più tardi."
            ) from exc
        raise

    if payload.get("source") != "balldontlie":
        raise RuntimeError("Fonte NBA non riconosciuta")

    games = payload.get("data", {}).get("data")

    if not isinstance(games, list):
        raise RuntimeError("Elenco partite NBA non valido")

    return games


def get_upcoming(games):
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=7)

    selected = []

    for game in games:
        if game.get("status_state") != "scheduled":
            continue

        date_text = game.get("datetime")

        if not date_text:
            continue

        try:
            when = datetime.fromisoformat(
                date_text.replace("Z", "+00:00")
            )

            if when.tzinfo is None:
                continue

        except (ValueError, TypeError):
            continue

        if not now <= when < end:
            continue

        home = (game.get("home_team") or {}).get(
            "full_name"
        )
        away = (game.get("visitor_team") or {}).get(
            "full_name"
        )

        if not home or not away:
            continue

        selected.append((when, home, away))

    return sorted(selected)


def main():
    games = fetch_games()
    upcoming = get_upcoming(games)

    if not upcoming:
        raise RuntimeError(
            "Nessuna partita NBA futura trovata "
            "nei dati ricevuti. "
            "La bozza non viene generata."
        )

    today = datetime.now(ROME).strftime("%d/%m/%Y")

    title = (
        f"NBA: calendario e partite "
        f"della settimana dal {today} | BetStorm"
    )

    rows = []

    for when, home, away in upcoming:
        local = when.astimezone(ROME).strftime(
            "%d/%m/%Y alle %H:%M"
        )

        rows.append(
            "<tr>"
            f"<td>{esc(local)}</td>"
            f"<td>{esc(home)}</td>"
            f"<td>{esc(away)}</td>"
            "</tr>"
        )

    page = f"""<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport"
content="width=device-width,initial-scale=1">
<title>{esc(title)}</title>
<meta name="description"
content="Calendario NBA della settimana: partite, squadre e orari italiani dai dati disponibili su BetStorm.">
<meta name="robots" content="noindex,nofollow">
<style>
body {{
  font-family:Arial,sans-serif;
  max-width:920px;
  margin:40px auto;
  padding:20px;
  background:#070b10;
  color:#f5f7fb;
  line-height:1.7;
}}
a {{color:#00e57b}}
h1 {{line-height:1.3}}
table {{
  width:100%;
  border-collapse:collapse;
}}
th,td {{
  border-bottom:1px solid #394454;
  padding:12px;
  text-align:left;
}}
th {{color:#00e57b}}
</style>
</head>
<body>
<header>
<a href="https://www.betstorm.it">BETSTORM</a>
</header>
<main>
<article>

<p>BOZZA EDITORIALE NON PUBBLICATA</p>

<h1>{esc(title)}</h1>

<p>
Scopri le partite NBA programmate nei prossimi
sette giorni secondo i dati attualmente
disponibili tramite BetStorm.
Gli orari sono convertiti nel fuso italiano.
</p>

<h2>Calendario NBA della settimana</h2>

<p>
Incontri individuati: {len(upcoming)}.
</p>

<table>
<thead>
<tr>
<th>Data e ora italiana</th>
<th>Squadra di casa</th>
<th>Squadra ospite</th>
</tr>
</thead>
<tbody>
{chr(10).join(rows)}
</tbody>
</table>

<h2>Come leggere il calendario NBA</h2>

<p>
Le date e gli orari sono convertiti
nel fuso Europe/Rome.
Eventuali modifiche al programma
potrebbero non essere ancora presenti
nei dati consultati.
</p>

<h2>Domande frequenti</h2>

<h3>Gli orari NBA sono italiani?</h3>
<p>
Sì. Gli orari indicati nella tabella
sono convertiti nel fuso italiano.
</p>

<h3>Il calendario comprende tutta la settimana?</h3>
<p>
La tabella mostra gli incontri futuri
trovati nei dati ricevuti.
La fonte potrebbe restituire soltanto
una parte del calendario.
</p>

<h3>Dove leggere altri articoli sportivi?</h3>
<p>
Visita il
<a href="https://www.betstorm.it/blog.html">
blog BetStorm
</a>.
</p>

<p>
Fonte: BALLDONTLIE tramite API BetStorm.
Dati consultati il {esc(today)}.
Nessuna quota o probabilità non verificata.
</p>

</article>
</main>
</body>
</html>"""

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(page, encoding="utf-8")

    print(f"Bozza NBA creata: {OUTPUT}")
    print(f"Partite incluse: {len(upcoming)}")
    print(
        "Attenzione: elenco potenzialmente parziale "
        "perché l'API restituisce una sola pagina."
    )
    print("Nessun articolo pubblicato.")


if __name__ == "__main__":
    main()
