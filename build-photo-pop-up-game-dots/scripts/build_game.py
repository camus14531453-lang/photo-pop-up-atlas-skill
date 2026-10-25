#!/usr/bin/env python3
"""Validate a local project and build one self-contained offline HTML file.
Uses only the Python standard library. Does not transform photos or recordings.
"""
import argparse
import base64
import json
import math
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
STARTER = ROOT / 'assets' / 'starter'
MIMES = {'.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.mp3':'audio/mpeg', '.wav':'audio/wav', '.ogg':'audio/ogg', '.m4a':'audio/mp4'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def text(value, label, limit=4000):
    require(isinstance(value, str) and 0 < len(value) <= limit, f'{label}: expected nonempty text up to {limit} characters')


def media(path, base, kind):
    require(isinstance(path, str), 'Media paths must be strings')
    p = (base / path).resolve()
    require(not Path(path).is_absolute() and p.is_relative_to(base.resolve()), 'Media must be a relative file inside the project folder')
    require(p.is_file(), f'Missing media: {path}')
    mime = MIMES.get(p.suffix.lower(), '')
    require(mime.startswith(kind + '/'), f'Unsupported {kind} format: {path}')
    require(p.stat().st_size <= 25 * 1024 * 1024, f'Media exceeds starter 25 MiB/file budget: {path}')
    data = p.read_bytes()
    if kind == 'image':
        valid = ((mime == 'image/png' and data.startswith(b'\x89PNG\r\n\x1a\n')) or
                 (mime == 'image/jpeg' and data.startswith(b'\xff\xd8\xff')) or
                 (mime == 'image/webp' and data[:4] == b'RIFF' and data[8:12] == b'WEBP'))
    else:
        valid = ((mime == 'audio/wav' and data[:4] == b'RIFF' and data[8:12] == b'WAVE') or
                 (mime == 'audio/ogg' and data.startswith(b'OggS')) or
                 (mime == 'audio/mp4' and data[4:8] == b'ftyp') or
                 (mime == 'audio/mpeg' and (data.startswith(b'ID3') or (len(data)>1 and data[0]==255 and data[1]&224==224))))
    require(valid, f'Media signature does not match extension: {path}')
    return 'data:' + mime + ';base64,' + base64.b64encode(data).decode('ascii')


def load_project(path):
    cfg = json.loads(path.read_text(encoding='utf-8'))
    return validate_project(cfg, path)

def validate_project(cfg, path):
    require(isinstance(cfg, dict), 'Project must be an object')
    require(type(cfg.get('schemaVersion')) is int and cfg['schemaVersion'] == 1, 'schemaVersion must be 1')
    if 'spreads' in cfg:
        spreads = cfg['spreads']
        require(isinstance(spreads, list) and 1 <= len(spreads) <= 24, 'Atlas supports 1–24 spreads')
        require('pieces' not in cfg and 'game' not in cfg, 'Use spreads or legacy pieces/game, not both')
        normalized = []
        ids = set()
        for spread in spreads:
            require(isinstance(spread, dict), 'Spread must be an object')
            sid = spread.get('id')
            require(isinstance(sid, str) and re.fullmatch(r'[a-z][a-z0-9-]{0,47}', sid) and sid not in ids, 'Invalid or duplicate spread ID')
            ids.add(sid)
            child = {k:v for k,v in cfg.items() if k != 'spreads'}
            child.update({k:spread[k] for k in ('title','intro','pieces','game') if k in spread})
            result = validate_project(child, path)
            maps = spread.get('maps', {})
            require(isinstance(maps, dict) and set(maps).issubset({'left','right'}), 'maps supports left/right only')
            result['maps'] = {side: media(value, path.parent, 'image') for side,value in maps.items()}
            if maps: text(spread.get('mapCaption'), 'mapCaption')
            result['mapCaption'] = spread.get('mapCaption', '')
            result['id'] = sid
            normalized.append(result)
        result = {k:normalized[0][k] for k in ('schemaVersion','language','ui')}
        for k in ('title','intro'): text(cfg.get(k), k); result[k] = cfg[k]
        result['spreads'] = normalized
        return result
    text(cfg.get('title'), 'title', 200); text(cfg.get('intro'), 'intro')
    cfg.setdefault('language', 'en')
    require(isinstance(cfg['language'], str) and re.fullmatch(r'[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8})*', cfg['language']), 'Invalid language tag')
    ui = cfg.get('ui', {})
    ui_keys = {'open','replay','soundOff','soundOn','useAccessible','use3d','ready','sceneLabel','choicesLabel','help','audioHint','audioFailed','audioBlocked','no3d','imageFailed','lost3d','progress','selectedSuffix'}
    require(isinstance(ui,dict) and set(ui).issubset(ui_keys), 'ui must contain only supported interface labels')
    for key,value in ui.items(): text(value, 'ui.' + key)
    if 'progress' in ui: require('{count}' in ui['progress'] and '{total}' in ui['progress'], 'ui.progress needs {count} and {total}')
    pieces = cfg.get('pieces')
    require(isinstance(pieces, list) and 1 <= len(pieces) <= 16, 'Starter supports 1–16 pieces')
    ids = []
    for p in pieces:
        require(isinstance(p, dict), 'Each piece must be an object')
        require(isinstance(p.get('id'),str) and re.fullmatch(r'[a-z][a-z0-9-]{0,47}',p['id']), 'Piece ID must use lowercase letters, digits, hyphens')
        require(p['id'] not in ids, 'Duplicate piece ID'); ids.append(p['id'])
        text(p.get('label'), f"{p['id']}.label", 300)
        p.setdefault('shape','square'); p.setdefault('color','#93baba'); p.setdefault('height',1)
        require(p['shape'] in ('triangle','square','pentagon','circle'), 'Unsupported fallback shape')
        require(isinstance(p['color'],str) and re.fullmatch(r'#[0-9a-fA-F]{6}',p['color']), 'Color must be #rrggbb')
        require(p.get('page') in ('left','right'), 'Page must be left or right')
        for key in ('x','z','height'):
            require(isinstance(p.get(key),(int,float)) and not isinstance(p[key],bool) and math.isfinite(p[key]), f'{key} must be finite')
        require(.2 <= p['height'] <= 1.4, 'Height outside starter range 0.2–1.4')
        require(-1.3 <= p['z'] <= 1.3, 'z outside paper bounds')
        require((-2.3 <= p['x'] <= -.2) if p['page']=='left' else (.2 <= p['x'] <= 2.3), 'x outside selected page')
        if 'caption' in p: text(p['caption'], 'caption')
        if p.get('audio'): require(bool(p.get('caption')), 'Audio pieces require a caption/equivalent text clue')
    game = cfg.get('game')
    require(isinstance(game, dict), 'game is required')
    require(game.get('mode') in ('sequence','collect'), 'Game mode must be sequence or collect')
    targets = game.get('targets')
    require(isinstance(targets,list) and targets and all(isinstance(x,str) for x in targets), 'targets must be nonempty IDs')
    require(len(set(targets)) == len(targets) and set(targets) == set(ids), 'Starter targets must include every piece exactly once')
    text(game.get('retryText'), 'retryText'); text(game.get('winText'), 'winText')
    for p in pieces:
        for kind in ('image','audio'):
            if kind in p:
                require(bool(p[kind]), f'Empty {kind} path')
                p[kind] = media(p[kind], path.parent, kind)
    # Publish only the runtime allowlist, never private project notes or approvals.
    allowed_piece = ('id','label','shape','color','page','x','z','height','image','audio','caption')
    return {key: cfg[key] for key in ('schemaVersion','title','intro','language')} | {
        'ui': ui,
        'game': {key: game[key] for key in ('mode','targets','retryText','winText')},
        'pieces': [{key:p[key] for key in allowed_piece if key in p} for p in pieces]
    }


def build(config_path, output=None, force=False):
    config_path = Path(config_path).resolve()
    cfg = load_project(config_path)
    template = (STARTER / 'template.html').read_text(encoding='utf-8')
    # Escape script terminators and HTML-sensitive characters in all project text.
    data = json.dumps(cfg, ensure_ascii=False).replace('&','\\u0026').replace('<','\\u003c').replace('>','\\u003e')
    replacements = {
        '__PROJECT_JSON__': data,
        '__THREE_LICENSE__': (STARTER/'vendor'/'THREE-LICENSE.txt').read_text(encoding='utf-8'),
        '__THREE_JS__': (STARTER/'vendor'/'three.min.js').read_text(encoding='utf-8'),
        '__STATE_JS__': (STARTER/'game-state.js').read_text(encoding='utf-8'),
        '__APP_JS__': (STARTER/'app.js').read_text(encoding='utf-8')
    }
    for marker in replacements:
        require(template.count(marker) == 1, f'Expected exactly one template marker: {marker}')
    template = re.sub('|'.join(re.escape(marker) for marker in replacements),
                      lambda match: replacements[match.group(0)], template)
    require(len(template.encode('utf-8')) <= 64 * 1024 * 1024, 'Output exceeds starter 64 MiB budget; optimize or adapt packaging')
    if output:
        out = Path(output).resolve()
        require(out.suffix.lower() == '.html', 'Output must end in .html')
        require(out != config_path and not out.is_relative_to(ROOT), 'Write generated games outside the installed skill')
        require(force or not out.exists(), 'Output exists; choose another path or pass --force')
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(template, encoding='utf-8')
    return template


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('project',type=Path,help='Project JSON with relative media paths')
    parser.add_argument('--output',type=Path,help='Destination HTML outside the installed skill')
    parser.add_argument('--check',action='store_true',help='Validate and assemble in memory without writing')
    parser.add_argument('--force',action='store_true',help='Replace only the specified output HTML')
    args=parser.parse_args()
    if not args.check and not args.output: parser.error('Supply --output or --check')
    try:
        result=build(args.project,None if args.check else args.output,args.force)
    except (ValueError,OSError,json.JSONDecodeError,KeyError,TypeError) as exc:
        print(f'Build rejected: {exc}',file=sys.stderr);return 1
    print(f"{'Validated' if args.check else 'Built'} offline HTML ({len(result.encode('utf-8')):,} bytes). Browser/media playback still require testing.")
    return 0

if __name__=='__main__':
    raise SystemExit(main())
