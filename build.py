#!/usr/bin/env python3
"""Arma index.html: la demo original (src/base.html) + la capa del anuncio (src/gx.css y src/gx.js)."""
import pathlib
root = pathlib.Path(__file__).parent
base = (root/'src'/'base.html').read_text(encoding='utf-8')
css = (root/'src'/'gx.css').read_text(encoding='utf-8')
js = (root/'src'/'gx.js').read_text(encoding='utf-8')
assert base.count('</head>') == 1 and base.count('</body>') == 1
out = base.replace('</head>', '<style id="gx-style">\n' + css + '</style>\n</head>')
out = out.replace('</body>', '<script id="gx-script">\n' + js + '</script>\n</body>')
(root/'index.html').write_text(out, encoding='utf-8')
print('index.html', len(out), 'bytes')
