"""
Rebuilds the site's front end from web/teami.src.html:
  1. compiles the Tailwind classes it uses (Tailwind 3.4.17 via npx) and inlines them,
  2. writes public/app.html (markup + styles) and public/app.js (the app), loading local vendor scripts.
Run from the repo root:  python3 web/build.py
"""
import os, re, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'web/teami.src.html'), encoding='utf8').read()

cfg = re.search(r'tailwind\.config = (\{.*?\n  \});', src, re.S).group(1)
body = re.search(r'<script>\n(\(\(\) => \{.*\}\)\(\);)\n</script>', src, re.S).group(1)
with tempfile.TemporaryDirectory() as tmp:
    open(f'{tmp}/app.js', 'w', encoding='utf8').write(body)
    open(f'{tmp}/tw.config.js', 'w').write(f'module.exports = Object.assign({cfg}, {{content: ["{tmp}/app.js"]}});')
    open(f'{tmp}/in.css', 'w').write('@tailwind base;@tailwind components;@tailwind utilities;')
    subprocess.run(['npx', '--yes', 'tailwindcss@3.4.17', '-c', f'{tmp}/tw.config.js', '-i', f'{tmp}/in.css', '-o', f'{tmp}/out.css', '--minify'], check=True, capture_output=True)
    css = open(f'{tmp}/out.css').read()

s = re.sub(r'<script src="https://cdn\.tailwindcss\.com/3\.4\.17"></script>\n<script>\n  tailwind\.config.*?</script>\n', '', src, count=1, flags=re.S)
i = s.index('</style>') + len('</style>')
s = s[:i] + '\n<style>' + css + '</style>' + s[i:]
m = re.search(r'<script>\n\(\(\) => \{.*\}\)\(\);\n</script>', s, re.S)
s = s[:m.start()] + '<script src="/app.js" defer></script>' + s[m.end():]
s = s.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>',
              '<script src="/teami-client.js" defer></script>\n<script src="/vendor/react.production.min.js" defer></script>')
s = s.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>', '<script src="/vendor/react-dom.production.min.js" defer></script>')
s = s.replace('<script src="https://unpkg.com/htm@3.1.1/dist/htm.umd.js"></script>', '<script src="/vendor/htm.umd.js" defer></script>')
assert '<script>' not in s and 'cdnjs' not in s and 'unpkg' not in s
page = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="description" content="TEAMi: find teammates, build real projects, and keep a portfolio backed by evidence.">'
        '<meta name="theme-color" content="#090b10"><link rel="icon" href="/icon.svg" type="image/svg+xml">'
        '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>'
        '</head><body>' + s + '</body></html>')
open(os.path.join(ROOT, 'public/app.html'), 'w', encoding='utf8').write(page)
open(os.path.join(ROOT, 'public/app.js'), 'w', encoding='utf8').write(body)
print('Built public/app.html and public/app.js')
