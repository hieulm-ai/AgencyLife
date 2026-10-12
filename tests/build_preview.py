from pathlib import Path
root=Path(__file__).resolve().parents[1]
s=(root/'game/index.html').read_text()
s=s.replace('SAVE="5bit.iso.game.v3"','SAVE="5bit.iso.meeting.qa.v1"')
end='})();\n</script></body></html>'
assert end in s
s=s.replace(end,(root/'tests/preview-controls.js').read_text()+'\n'+end)
(root/'game/meeting-preview.html').write_text(s)
print('Created isolated meeting-preview.html')
