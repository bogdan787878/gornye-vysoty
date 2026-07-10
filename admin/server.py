#!/usr/bin/env python3
"""
Локальная админка "Горные высоты".
Запуск: python3 admin/server.py
Открыть:
  http://localhost:8091/        — сам сайт в режиме редактирования
                                   (клик по областям с пунктирной рамкой грузит картинку)
  http://localhost:8091/admin   — управление планировками (загрузка + список + удаление)

Всё, что вы загружаете, сохраняется локально и ставится в git (git add).
Ничего не пушится, пока вы не нажмёте "Опубликовать" — тогда одним разом
делается commit + push всех накопленных изменений.
"""

import cgi
import json
import mimetypes
import os
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

PORT = 8091

ADMIN_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(ADMIN_DIR)          # .../gornye-vysoty
REPO_DIR = PROJECT_DIR                            # gornye-vysoty — сам корень репозитория
IMAGES_DIR = os.path.join(PROJECT_DIR, 'images', 'planirovki')
DATA_FILE = os.path.join(PROJECT_DIR, 'data', 'planirovki.json')
IMAGES_MANIFEST = os.path.join(PROJECT_DIR, 'data', 'images.json')

os.makedirs(IMAGES_DIR, exist_ok=True)

# Цена — константа по количеству комнат (0 = студия), не вводится вручную
PRICE_BY_ROOMS = {
    0: 3400000,
    1: 4900000,
    2: 6700000,
    3: 8100000,
}


# ── Работа с данными ──────────────────────────────────────────

def load_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')


def next_plan_id(plans):
    nums = []
    for p in plans:
        try:
            nums.append(int(p['id'].split('-')[-1]))
        except (KeyError, ValueError, IndexError):
            pass
    n = (max(nums) + 1) if nums else 1
    return 'pl-%03d' % n


# ── Git ────────────────────────────────────────────────────────

def git(*args):
    return subprocess.run(['git', '-C', REPO_DIR] + list(args), capture_output=True, text=True)


def git_stage(paths):
    if not paths:
        return
    git('add', *paths)


def git_pending_count():
    r = git('status', '--porcelain')
    lines = [l for l in r.stdout.splitlines() if l.strip()]
    return len(lines)


def git_release():
    log = []
    r = git('add', '.')
    log.append('$ git add .\n' + r.stdout + r.stderr)

    r = git('commit', '-m', 'Update Gornye Vysoty content (images/planirovki)')
    log.append('$ git commit\n' + r.stdout + r.stderr)
    if r.returncode != 0 and 'nothing to commit' not in (r.stdout + r.stderr):
        return False, '\n'.join(log)

    r = git('push', 'origin', 'main')
    log.append('$ git push origin main\n' + r.stdout + r.stderr)
    if r.returncode != 0:
        return False, '\n'.join(log)

    return True, '\n'.join(log)


# ── HTML страницы ──────────────────────────────────────────────

ADMIN_PAGE = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Планировки — Горные высоты</title>
<style>
  body {{ font-family: -apple-system, sans-serif; background:#EFEAE6; color:#3A4951; margin:0; padding:32px; }}
  h1 {{ font-size: 24px; margin-bottom: 8px; }}
  .top-link {{ margin-bottom:24px; display:inline-block; }}
  .card {{ background:#fff; border-radius:16px; padding:24px; margin-bottom:24px; max-width:640px; }}
  label {{ display:block; font-size:13px; opacity:0.6; margin-bottom:4px; margin-top:12px; }}
  input, select {{ width:100%; padding:10px 12px; border-radius:8px; border:1px solid #ddd; font-size:16px; box-sizing:border-box; }}
  button {{ margin-top:20px; background:#748C74; color:#fff; border:none; border-radius:100px; padding:12px 28px; font-size:16px; cursor:pointer; }}
  button.danger {{ background:#B24747; padding:6px 14px; font-size:13px; margin-top:8px; }}
  .grid {{ display:grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); gap:16px; max-width:1100px; }}
  .plan {{ background:#fff; border-radius:12px; padding:12px; }}
  .plan img {{ width:100%; aspect-ratio:1; object-fit:cover; border-radius:8px; background:#EFEAE6; }}
  .plan .meta {{ font-size:13px; margin:8px 0; }}
  .log {{ white-space:pre-wrap; background:#1e1e1e; color:#0f0; padding:16px; border-radius:8px; font-size:12px; max-width:800px; overflow:auto; }}
  .ok {{ color: #2f7d32; font-weight:600; }}
  .err {{ color: #b23a3a; font-weight:600; }}
  a {{ color:#3A4951; }}
</style>
</head>
<body>
<a class="top-link" href="/">← Вернуться на сайт (режим редактирования)</a>
<h1>Планировки — Горные высоты</h1>
{message}
<div class="card">
  <form method="POST" action="/admin/upload" enctype="multipart/form-data">
    <label>Картинка планировки</label>
    <input type="file" name="image" accept="image/*" required>
    <label>Название</label>
    <input type="text" name="title" placeholder="2-комн. 58,4 м²" required>
    <label>Комнат</label>
    <select name="rooms" required>
      <option value="0">Студия</option>
      <option value="1">1</option>
      <option value="2">2</option>
      <option value="3">3</option>
    </select>
    <label>Площадь, м²</label>
    <input type="number" name="area" step="0.1" required>
    <button type="submit">Добавить планировку</button>
  </form>
</div>

<h2>Все планировки ({count})</h2>
<div class="grid">
{cards}
</div>
</body>
</html>"""


def render_plan_cards(plans):
    out = []
    for p in plans:
        img = p.get('image') or ''
        out.append(
            '<div class="plan">'
            '<img src="/{img}" alt="">'
            '<div class="meta"><b>{title}</b><br>{area} м² · {price} ₽</div>'
            '<form method="POST" action="/admin/delete" style="margin:0;">'
            '<input type="hidden" name="id" value="{id}">'
            '<button class="danger" type="submit" onclick="return confirm(\'Удалить {id}?\')">Удалить</button>'
            '</form>'
            '</div>'.format(
                img=img, title=p.get('title', ''), area=p.get('area', ''),
                price=p.get('price', 0), id=p.get('id', '')
            )
        )
    return '\n'.join(out) or '<p style="opacity:0.5">Пока нет планировок</p>'


def render_admin_page(message=''):
    plans = load_json(DATA_FILE, [])
    return ADMIN_PAGE.format(message=message, count=len(plans), cards=render_plan_cards(plans))


# ── HTTP-сервер ─────────────────────────────────────────────────

class Handler(BaseHTTPRequestHandler):

    def _send_bytes(self, body, code=200, content_type='text/html; charset=utf-8'):
        self.send_response(code)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_html(self, html, code=200):
        self._send_bytes(html.encode('utf-8'), code)

    def _send_json(self, data, code=200):
        self._send_bytes(json.dumps(data).encode('utf-8'), code, 'application/json')

    def _serve_static(self, path):
        rel = path.lstrip('/') or 'index.html'
        fpath = os.path.join(PROJECT_DIR, rel)
        if not os.path.abspath(fpath).startswith(PROJECT_DIR) or not os.path.isfile(fpath):
            self._send_html('<h1>404</h1>', 404)
            return
        ctype, _ = mimetypes.guess_type(fpath)
        with open(fpath, 'rb') as f:
            self._send_bytes(f.read(), 200, ctype or 'application/octet-stream')

    # ── GET ──
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/api/ping':
            self._send_json({'ok': True})
        elif path == '/api/status':
            self._send_json({'pending': git_pending_count()})
        elif path == '/admin':
            self._send_html(render_admin_page())
        else:
            self._serve_static(path)

    # ── POST ──
    def do_POST(self):
        path = urlparse(self.path).path
        if path == '/api/upload-slot':
            self._upload_slot()
        elif path == '/api/release':
            self._release()
        elif path == '/admin/upload':
            self._admin_upload()
        elif path == '/admin/delete':
            self._admin_delete()
        else:
            self._send_html('<h1>404</h1>', 404)

    def _read_form(self):
        ctype = self.headers.get('Content-Type', '')
        return cgi.FieldStorage(
            fp=self.rfile, headers=self.headers,
            environ={'REQUEST_METHOD': 'POST', 'CONTENT_TYPE': ctype}
        )

    def _upload_slot(self):
        qs = parse_qs(urlparse(self.path).query)
        slot = (qs.get('slot') or [''])[0]
        if not slot:
            self._send_json({'ok': False, 'error': 'no slot'}, 400)
            return

        form = self._read_form()
        image_field = form['image'] if 'image' in form else None
        if image_field is None or not image_field.filename:
            self._send_json({'ok': False, 'error': 'no file'}, 400)
            return

        ext = os.path.splitext(image_field.filename)[1].lower() or '.jpg'
        filename = slot + ext
        fpath = os.path.join(PROJECT_DIR, 'images', filename)
        with open(fpath, 'wb') as f:
            f.write(image_field.file.read())

        manifest = load_json(IMAGES_MANIFEST, {})
        rel_path = 'images/' + filename
        manifest[slot] = rel_path
        save_json(IMAGES_MANIFEST, manifest)

        git_stage([
            os.path.relpath(fpath, REPO_DIR),
            os.path.relpath(IMAGES_MANIFEST, REPO_DIR),
        ])

        self._send_json({'ok': True, 'path': rel_path})

    def _release(self):
        ok, log = git_release()
        print(log)
        self._send_json({'ok': ok, 'log': log})

    def _admin_upload(self):
        form = self._read_form()
        image_field = form['image'] if 'image' in form else None
        if image_field is None or not image_field.filename:
            self._send_html(render_admin_page('<p class="err">Не выбрана картинка</p>'))
            return

        plans = load_json(DATA_FILE, [])
        pid = next_plan_id(plans)
        ext = os.path.splitext(image_field.filename)[1].lower() or '.jpg'
        filename = pid + ext
        fpath = os.path.join(IMAGES_DIR, filename)
        with open(fpath, 'wb') as f:
            f.write(image_field.file.read())

        rooms = int(form.getvalue('rooms', 0))
        entry = {
            'id': pid,
            'image': 'images/planirovki/' + filename,
            'title': form.getvalue('title', ''),
            'rooms': rooms,
            'area': float(form.getvalue('area', 0)),
            'price': PRICE_BY_ROOMS.get(rooms, 0),
        }
        plans.append(entry)
        save_json(DATA_FILE, plans)

        git_stage([
            os.path.relpath(fpath, REPO_DIR),
            os.path.relpath(DATA_FILE, REPO_DIR),
        ])

        self._send_html(render_admin_page(
            '<p class="ok">Планировка %s добавлена (готова к публикации)</p>' % pid
        ))

    def _admin_delete(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8')
        params = {}
        for pair in body.split('&'):
            if '=' in pair:
                k, v = pair.split('=', 1)
                params[k] = v
        pid = params.get('id', '')

        plans = load_json(DATA_FILE, [])
        target = next((p for p in plans if p['id'] == pid), None)
        if not target:
            self._send_html(render_admin_page('<p class="err">Планировка %s не найдена</p>' % pid))
            return

        img_path = os.path.join(PROJECT_DIR, target['image']) if target.get('image') else None
        plans = [p for p in plans if p['id'] != pid]
        save_json(DATA_FILE, plans)

        paths = [os.path.relpath(DATA_FILE, REPO_DIR)]
        if img_path and os.path.exists(img_path):
            os.remove(img_path)
            paths.append(os.path.relpath(img_path, REPO_DIR))
        git_stage(paths)

        self._send_html(render_admin_page(
            '<p class="ok">Планировка %s удалена (готово к публикации)</p>' % pid
        ))

    def log_message(self, fmt, *args):
        sys.stderr.write('%s - %s\n' % (self.address_string(), fmt % args))


if __name__ == '__main__':
    print('Сайт (режим редактирования): http://localhost:%d/' % PORT)
    print('Планировки:                  http://localhost:%d/admin' % PORT)
    print('Репозиторий: %s' % REPO_DIR)
    HTTPServer(('localhost', PORT), Handler).serve_forever()
