"""Standalone visual QA for the real loading markup; never reads/writes game saves."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
s=(root/'game/index.html').read_text()
head=s[:s.index('</head>')]
boot=re.search(r'<section id="boot".*?</section>',s,re.S)[0]
controls='''<div class="preview-controls"><label>Tiến độ mô phỏng <input aria-label="Tiến độ mô phỏng" type="range" min="0" max="100" value="50" oninput="demo(this.value)"></label><button onclick="demo(0)">0%</button><button onclick="demo(50)">50%</button><button onclick="demo(100)">100%</button></div>
<script>function demo(v){document.getElementById('bootProgress').value=v;document.getElementById('bootTrack').style.setProperty('--progress',v+'%');document.getElementById('bootStatus').textContent='Đang tải văn phòng · '+v+'%';document.querySelector('input').value=v;}demo(50);</script>'''
(root/'game/loading-preview.html').write_text(head+'''<style>.preview-controls{position:fixed;z-index:6000;bottom:4px;left:4px;right:4px;text-align:center;background:#fff5dfeb;font-size:12px;padding:4px}#boot{padding-bottom:54px}</style></head><body>'''+boot+controls+'</body></html>')
print('Loading preview updated (isolated from saves).')
