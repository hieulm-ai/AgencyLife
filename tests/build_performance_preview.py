from pathlib import Path
import argparse
root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--before', action='store_true')
args = parser.parse_args()
name = 'performance-before' if args.before else 'performance-preview'
text = (root / 'game/index.html').read_text()
text = text.replace('SAVE="5bit.iso.game.v3"', f'SAVE="agency.qa.{name}.v1"')
text = text.replace('bootStart();', 'bootStart().then(()=>{if(!bootBusy)enterOffice(false);});')
end = '})();\n</script></body></html>'
assert end in text
text = text.replace(end, (root / 'tests/performance-preview.js').read_text() + '\n' + end)
(root / f'game/{name}.html').write_text(text)
print(f'Created isolated {name}.html')
