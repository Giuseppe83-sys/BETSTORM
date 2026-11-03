#!/usr/bin/env python3
"""BetStorm: pubblica un articolo settimanale di calcio, solo con dati verificati."""
import argparse
import html
import time
import json
import re
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

BASE = 'https://betstorm.it/api/football'
ROME = ZoneInfo('Europe/Rome')
COMPETITIONS = {
    'CL': 'Champions League', 'EL': 'Europa League',
    'EC': 'Conference League', 'SA': 'Serie A',
    'PL': 'Premier League', 'PD': 'Liga',
    'BL1': 'Bundesliga', 'FL1': 'Ligue 1',
    'DED': 'Eredivisie', 'PPL': 'Primeira Liga',
}
BLOG = Path('blog')
MIN_REQUEST_INTERVAL = 7.0  # Protegge il limite della fonte (richieste/minuto).
_last_request = 0.0


def esc(value):
    return html.escape(str(value), quote=True)


def fetch_matches(code, **filters):
    """Richieste distanziate e tentativi limitati per HTTP 429."""
    global _last_request
    url = BASE + '?' + urllib.parse.urlencode({'type': 'matches', 'code': code, **filters})
    request = urllib.request.Request(url, headers={'User-Agent': 'BetStorm-SEO-Blog/4.0'})
    for attempt in range(3):
        elapsed = time.monotonic() - _last_request
        if elapsed < MIN_REQUEST_INTERVAL:
            time.sleep(MIN_REQUEST_INTERVAL - elapsed)
        _last_request = time.monotonic()
        try:
            with urllib.request.urlopen(request, timeout=35) as response:
                payload = json.load(response)
            if payload.get('source') != 'football-data.org':
                raise ValueError('Fonte dati non verificata')
            matches = payload.get('data', {}).get('matches')
            if not isinstance(matches, list):
                raise ValueError('Elenco partite mancante')
            return matches
        except urllib.error.HTTPError as exc:
            if exc.code != 429 or attempt == 2:
                raise
            retry_after = exc.headers.get('Retry-After')
            try:
                delay = min(120, max(20, int(retry_after)))
            except (ValueError, TypeError):
                delay = 30 * (attempt + 1)
            print(f'{code}: limite API (429), nuovo tentativo tra {delay}s', flush=True)
            time.sleep(delay)
    raise RuntimeError('Impossibile ottenere le partite')


def date_of(match):
    try:
        return datetime.fromisoformat(match['utcDate'].replace('Z', '+00:00'))
    except (KeyError, ValueError, TypeError, AttributeError):
        return None


def team(match, side):
    return (match.get(side) or {}).get('name') or ''


def team_id(match, side):
    return (match.get(side) or {}).get('id')


def result(match):
    score = (match.get('score') or {}).get('fullTime') or {}
    a, b = score.get('home'), score.get('away')
    return (a, b) if type(a) is int and type(b) is int else None


def recent(team_identifier, history, before):
    matches = [m for m in history if date_of(m) and date_of(m) < before
               and team_identifier in (team_id(m, 'homeTeam'), team_id(m, 'awayTeam'))]
    return sorted(matches, key=date_of, reverse=True)[:5]


def statistics(identifier, matches):
    wins = draws = losses = goals_for = goals_against = 0
    lines = []
    for match in matches:
        a, b = result(match)
        is_home = team_id(match, 'homeTeam') == identifier
        gf, ga = (a, b) if is_home else (b, a)
        wins += gf > ga
        draws += gf == ga
        losses += gf < ga
        goals_for += gf
        goals_against += ga
        label = 'V' if gf > ga else 'N' if gf == ga else 'P'
        lines.append(f'<li>{date_of(match).astimezone(ROME):%d/%m/%Y}: '
                     f'{esc(team(match, "homeTeam"))} {a}–{b} '
                     f'{esc(team(match, "awayTeam"))} ({label})</li>')
    return (f'{len(matches)} gare: {wins} vittorie, {draws} pareggi, '
            f'{losses} sconfitte; {goals_for} gol fatti, {goals_against} subiti.',
            '<ol>' + ''.join(lines) + '</ol>')


def build_analysis(match, history):
    when = date_of(match)
    parts = []
    for side in ('homeTeam', 'awayTeam'):
        identifier = team_id(match, side)
        games = recent(identifier, history, when)
        if not games:
            parts.append(f'<div><h4>{esc(team(match, side))}</h4><p>Dati storici insufficienti.</p></div>')
        else:
            summary, trends = statistics(identifier, games)
            parts.append(f'<div><h4>{esc(team(match, side))}</h4><p>{summary}</p>{trends}</div>')
    return (f'<section class="match"><h3>{esc(team(match, "homeTeam"))} – '
            f'{esc(team(match, "awayTeam"))}</h3>'
            f'<p class="muted">{when.astimezone(ROME):%d/%m/%Y alle %H:%M}</p>'
            f'<div class="compare">{"".join(parts)}</div></section>')


def update_index(slug, title, description, date):
    index_path = BLOG / 'articles-index.json'
    data = {'articles': []}
    if index_path.exists():
        data = json.loads(index_path.read_text(encoding='utf-8'))
    articles = [a for a in data.get('articles', []) if a.get('slug') != slug]
    articles.append({'slug': slug, 'title': title, 'excerpt': description,
                     'date': date, 'category': 'Calcio'})
    articles.sort(key=lambda a: (a.get('date', ''), a.get('slug', '')), reverse=True)
    index_path.write_text(json.dumps({'articles': articles}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def update_sitemap(slug, date):
    path = Path('sitemap.xml')
    if not path.exists():
        raise RuntimeError('sitemap.xml non trovato')
    ns = 'http://www.sitemaps.org/schemas/sitemap/0.9'
    ET.register_namespace('', ns)
    tree = ET.parse(path)
    root = tree.getroot()
    loc = f'https://betstorm.it/blog/{slug}.html'
    if any(node.text == loc for node in root.findall(f'.//{{{ns}}}loc')):
        return
    entry = ET.SubElement(root, f'{{{ns}}}url')
    ET.SubElement(entry, f'{{{ns}}}loc').text = loc
    ET.SubElement(entry, f'{{{ns}}}lastmod').text = date
    ET.SubElement(entry, f'{{{ns}}}changefreq').text = 'weekly'
    ET.SubElement(entry, f'{{{ns}}}priority').text = '0.7'
    tree.write(path, encoding='unicode', xml_declaration=True)


def main():
    parser = argparse.ArgumentParser(description='Genera articolo settimanale BetStorm')
    parser.add_argument('--refresh-today', action='store_true',
                        help='Aggiorna il solo articolo di oggi, se esiste')
    parser.add_argument('--require-cups', action='store_true',
                        help='Non aggiornare se nessuna tra Champions ed Europa League ha partite future accessibili')
    args = parser.parse_args()
    now = datetime.now(timezone.utc)
    local = now.astimezone(ROME)
    date = local.strftime('%Y-%m-%d')
    slug = f'calcio-europeo-{date}'
    target = BLOG / f'{slug}.html'
    if target.exists() and not args.refresh_today:
        print(f'Articolo già presente, nessun duplicato: {target}')
        return

    end = now + timedelta(days=7)
    upcoming = []
    history_by_code = {}
    available = []
    available_codes = set()
    for code, name in COMPETITIONS.items():
        try:
            future = fetch_matches(code, dateFrom=now.date().isoformat(),
                                   dateTo=(end + timedelta(days=1)).date().isoformat())
            past = fetch_matches(code, status='FINISHED',
                                 dateFrom=(now - timedelta(days=100)).date().isoformat(),
                                 dateTo=now.date().isoformat())
            future = [m for m in future if m.get('status') in ('SCHEDULED', 'TIMED')
                      and date_of(m) and now <= date_of(m) < end
                      and team(m, 'homeTeam') and team(m, 'awayTeam')
                      and team_id(m, 'homeTeam') and team_id(m, 'awayTeam')]
            past = [m for m in past if m.get('status') == 'FINISHED' and date_of(m)
                    and date_of(m) <= now and result(m) is not None
                    and team_id(m, 'homeTeam') and team_id(m, 'awayTeam')]
            if future:
                available_codes.add(code)
                for match in future:
                    upcoming.append((code, name, match))
                history_by_code[code] = past
                available.append(name)
            print(f'{name}: {len(future)} partite future, {len(past)} risultati conclusi')
        except (urllib.error.URLError, TimeoutError, ValueError, KeyError, OSError) as exc:
            print(f'{name}: dati non disponibili ({exc}); competizione saltata')

    if args.require_cups and not any(code in available_codes for code in ('CL', 'EL')):
        raise RuntimeError('Nessuna partita disponibile di Champions o Europa League: articolo esistente conservato')

    upcoming.sort(key=lambda item: date_of(item[2]))
    if len(upcoming) < 3 or not any(history_by_code.get(code) for code, _, _ in upcoming):
        raise RuntimeError('Dati insufficienti: pubblicazione annullata (servono 3 partite e risultati storici)')

    start_it = local.strftime('%d/%m/%Y')
    end_it = end.astimezone(ROME).strftime('%d/%m/%Y')
    title = f'Calcio europeo dal {start_it}: calendario e analisi Storm | BetStorm'
    description = f'Calendario del calcio dal {start_it} al {end_it}: partite e analisi delle principali competizioni europee, basate su dati reali.'
    rows = ''.join(f'<tr><td>{date_of(m).astimezone(ROME):%d/%m/%Y %H:%M}</td>'
                   f'<td>{esc(name)}</td><td>{esc(team(m, "homeTeam"))}</td>'
                   f'<td>{esc(team(m, "awayTeam"))}</td></tr>'
                   for _, name, m in upcoming)
    # Seleziona tre gare con almeno un risultato precedente, senza mischiare le competizioni.
    analyzed = [(code, name, m) for code, name, m in upcoming
                if history_by_code.get(code) and (
                    recent(team_id(m, 'homeTeam'), history_by_code[code], date_of(m)) or
                    recent(team_id(m, 'awayTeam'), history_by_code[code], date_of(m)))]
    if len(analyzed) < 2:
        raise RuntimeError('Analisi storiche insufficienti: pubblicazione annullata')
    analyses = ''.join(f'<h3>{esc(name)}</h3>{build_analysis(m, history_by_code[code])}'
                       for code, name, m in analyzed[:3])
    canonical = f'https://betstorm.it/blog/{slug}.html'
    article = f'''<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title><meta name="description" content="{esc(description)}">
<meta name="robots" content="index,follow"><link rel="canonical" href="{canonical}">
<style>
:root{{--bg:#070b10;--card:#0d1218;--text:#f5f7fb;--muted:#9eb0c8;--green:#00e57b;--line:#26303b}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--text);font-family:Arial,sans-serif;line-height:1.7}}
header,main,footer{{max-width:960px;margin:auto;padding:22px}}header,footer{{border-bottom:1px solid var(--line)}}
a{{color:var(--green)}}article{{margin:30px 0;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:clamp(18px,4vw,42px)}}
h1{{line-height:1.2}}h2{{margin-top:35px;color:var(--green)}}h3{{margin-top:22px}}p,li{{color:#d6deea}}
.muted{{color:var(--muted)}}.table-wrap{{overflow-x:auto}}table{{width:100%;min-width:650px;border-collapse:collapse}}
th,td{{padding:11px;border-bottom:1px solid var(--line);text-align:left}}th{{color:var(--green)}}
.match{{border:1px solid var(--line);border-radius:14px;padding:22px;margin:18px 0}}.compare{{display:grid;grid-template-columns:1fr 1fr;gap:16px}}
@media(max-width:650px){{.compare{{grid-template-columns:1fr}}}}
</style></head><body><header><a href="https://betstorm.it/">BETSTORM</a> · <a href="https://betstorm.it/blog.html">Blog</a></header>
<main><article><h1>{esc(title)}</h1><p>{esc(description)}</p>
<p>Competizioni con partite disponibili: {esc(', '.join(available))}. I dati provengono da football-data.org tramite l'API BetStorm.</p>
<h2>Calendario delle prossime sette giornate</h2><p>{len(upcoming)} incontri programmati tra il {start_it} e il {end_it}; orari italiani (Europe/Rome). Gli orari possono cambiare.</p>
<div class="table-wrap"><table><thead><tr><th>Data e ora</th><th>Competizione</th><th>Casa</th><th>Trasferta</th></tr></thead><tbody>{rows}</tbody></table></div>
<h2>Storm Match Center: forma recente</h2><p>Analisi descrittive basate su un massimo di cinque partite concluse della stessa competizione, prima dell'incontro. Non sono pronostici.</p>
{analyses}
<h2>Metodo e limiti</h2><p>Confrontiamo vittorie, pareggi, sconfitte e reti nelle partite disponibili. La copertura varia per competizione e non garantisce risultati futuri. Non sono riportate quote o probabilità di vincita.</p>
<h2>Domande frequenti</h2><h3>Gli orari sono italiani?</h3><p>Sì, sono convertiti nel fuso Europe/Rome.</p>
<h3>Le statistiche sono pronostici?</h3><p>No, descrivono soltanto risultati precedenti.</p>
<p class="muted">Fonte: football-data.org tramite API BetStorm. Dati consultati il {local:%d/%m/%Y alle %H:%M}.</p>
</article></main><footer>© BetStorm</footer></body></html>'''
    # Non pubblicare contenuti contrassegnati come bozza.
    if 'noindex' in article.lower() or 'BOZZA EDITORIALE' in article.upper():
        raise RuntimeError('Contenuto non pubblicabile')
    BLOG.mkdir(parents=True, exist_ok=True)
    target.write_text(article, encoding='utf-8')
    update_index(slug, title, description, date)
    update_sitemap(slug, date)
    print(f'PUBBLICATO/AGGIORNATO: {target}; {len(upcoming)} partite, {len(available)} competizioni')


if __name__ == '__main__':
    main()
