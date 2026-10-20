
import html
import json
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

BASE_URL = "https://www.betstorm.it/api/basket"
ROME = ZoneInfo("Europe/Rome")
OUTPUT = Path("bozze/bozza-nba.html")


def esc(value):
    return html.escape(str(value), quote=True)


def fetch_games(season, cursor=None):
    url = f"{BASE_URL}?type=games&season={season}"

    if cursor is not None:
        url += f"&cursor={cursor}"

    request = urllib.request.Request(
        url,
        headers={"User-Agent": "BetStorm-SEO-NBA/1.0"}
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.load(response)

    if payload.get("source") != "balldontlie":
        raise RuntimeError("Fonte NBA non riconosciuta")

    data = payload.get("data", {})
    games = data.get("data")

    if not isinstance(games, list):
        raise RuntimeError("Elenco NBA non valido")

    return games, data.get("meta", {}).get("next_cursor")


def load_upcoming():
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=7)

    # Una stagione NBA attraversa due anni solari.
    seasons = {now.year, now.year - 1}
    selected = []
    seen = set()

    for season in sorted(seasons):
        cursor = None
        visited = set()

        for _ in range(30):
            games, next_cursor = fetch_games(season, cursor)

            for game in games:
                try:
                    date_text = game["date"]
                    when = datetime.fromisoformat(
                        date_text.replace("Z", "+00:00")
                    )
                    if when.tzinfo is None:
                        when = when.replace(tzinfo=timezone.utc)
                except (KeyError, ValueError, TypeError):
                    continue

                if not (now <= when < end):
                    continue

                state = str(
                    game.get("status_state", "")
                ).lower()

                if state != "scheduled":
                    continue

                home = (game.get("home_team") or {}).get(
                    "full_name"
                )
                away = (game.get("visitor_team") or {}).get(
                    "full_name"
                )

                if not home or not away:
                    continue

                key = game.get("id") or (
                    date_text, home, away
                )

                if key in seen:
                    continue

                seen.add(key)
                selected.append((when, home, away))

            if next_cursor is None:
                break

            if next_cursor in visited:
                raise RuntimeError("Paginazione NBA ripetuta")

            visited.add(next_cursor)
            cursor = next_cursor
        else:
            raise RuntimeError(
                "Limite pagine NBA raggiunto: "
                "calendario potenzialmente incompleto"
            )

    return sorted(selected)


def main():
    games = load_upcoming()

    if not games:
        raise RuntimeError(
            "Nessuna partita NBA futura verificata: "
            "bozza non generata"
        )

    today = datetime.now(ROME).strftime("%d/%m/%Y")
    title = f"NBA: calendario della settimana dal {today} | BetStorm"

    rows = []

    for when, home, away in games:
        local = when.astimezone(ROME).strftime(
            "%d/%m/%Y %H:%M"
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
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title>
<meta name="description"
content="Calendario NBA dei prossimi sette giorni: squadre e date delle partite disponibili nei dati BetStorm.">
<meta name="robots" content="noindex,nofollow">
<style>
body {{
  font-family:Arial,sans-serif;
  max-width:900px;
  margin:40px auto;
  padding:20px;
  background:#070b10;
  color:#f5f7fb;
  line-height:1.7;
}}
a {{color:#00e57b}}
table {{width:100%;border-collapse:collapse}}
th,td {{
  border:1px solid #394454;
  padding:12px;
  text-align:left;
}}
</style>
</head>
<body>
<header>
<a href="https://www.betstorm.it">BETSTORM</a>
</header>
<main>
<article>
<h1>{esc(title)}</h1>
<p>Bozza editoriale non pubblicata.</p>
<p>
Calendario NBA basato sui dati disponibili
tramite l'API Basket di BetStorm.
</p>
<h2>Le partite dei prossimi sette giorni</h2>
<p>Incontri trovati: {len(games)}.</p>
<table>
<thead>
<tr>
<th>Data e ora riportata dalla fonte</th>
<th>Casa</th>
<th>Trasferta</th>
</tr>
</thead>
<tbody>
{chr(10).join(rows)}
</tbody>
</table>
<h2>Informazioni sul calendario</h2>
<p>
Gli incontri sono ordinati cronologicamente.
Le date e gli orari possono cambiare.
</p>
<p>
Attenzione: la data fornita dall'API potrebbe
non includere l'orario effettivo di inizio.
Verificare gli orari prima della pubblicazione.
</p>
<p>
Fonte: BALLDONTLIE tramite BetStorm.
Dati consultati il {esc(today)}.
</p>
<p>
<a href="https://www.betstorm.it/blog.html">
Altri articoli BetStorm
</a>
</p>
</article>
</main>
</body>
</html>"""

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(page, encoding="utf-8")

    print(f"Bozza NBA creata: {OUTPUT}")
    print(f"Partite incluse: {len(games)}")
    print("Nessun articolo pubblicato.")


if __name__ == "__main__":
    main()
