import json, numpy as np, sys
from PIL import Image
sys.path.insert(0,'/home/claude/rb'); from rebuild_funcs import hard
src3=open('/home/claude/rb/fix3.py').read()
head=src3.split("B=json.load")[0]; funcs="def contour"+src3.split("def contour")[1].split("def renorm")[0]
exec(head); exec(funcs, globals())
DESKEW={'furniture/pantry_counter','props/decorative_blue_mark','props/water_dispenser','furniture/bookshelf','furniture/printer_cabinet','furniture/reception_counter'}
D['architecture']='nhi/architecture'
M=json.load(open("/home/claude/rb/out/_build.json"))["manifest"]; K=3; n=0
for key,it in M['items'].items():
    if it['layer'] not in ('object','floor'): continue
    cat,name=key.split('/')
    for v in ROT:
        vv=it['views'][v]; im=hard(Image.open(f'{SRC}/{D[cat]}/{name}/{v}.png'))
        if key in DESKEW: im,_,_=deskew(im)
        tw,th=vv['size']; hd=im.resize((tw*K,th*K),Image.LANCZOS); a=np.array(hd); a[:,:,3]=np.where(a[:,:,3]>=100,255,0)
        import os; os.makedirs(f'/home/claude/itemhd/{key}',exist_ok=True); Image.fromarray(a).save(f'/home/claude/itemhd/{key}/{v}.png'); n+=1
print('hd views',n)
