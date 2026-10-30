#!/usr/bin/env python3
# Собирает sw.js: список всех файлов игры для офлайна и версию по их содержимому.
# Запускать перед каждым коммитом, который меняет index.html или картинки.
import hashlib, json, os, subprocess

root = os.path.dirname(os.path.abspath(__file__))
files = subprocess.run(['git', 'ls-files', '--cached', '--others', '--exclude-standard'], cwd=root, capture_output=True, text=True, check=True).stdout.split()
skip = {'sw.js', 'sw-template.js', 'make-sw.py', 'README.md', '.gitignore', 'test.html', 'test2.html'}
files = sorted(f for f in files if f not in skip and not f.startswith('.'))
h = hashlib.sha1()
for f in files:
    h.update(f.encode())
    with open(os.path.join(root, f), 'rb') as fh: h.update(fh.read())
ver = h.hexdigest()[:10]
assets = ['./'] + files
with open(os.path.join(root, 'sw-template.js')) as fh: tpl = fh.read()
with open(os.path.join(root, 'sw.js'), 'w') as fh:
    fh.write(tpl.replace('__VERSION__', ver).replace('__ASSETS__', json.dumps(assets, ensure_ascii=False, indent=0)))
print('sw.js', ver, len(assets), 'файлов')
