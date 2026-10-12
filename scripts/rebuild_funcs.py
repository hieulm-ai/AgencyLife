import numpy as np
from PIL import Image
def hard(im):
    a=np.array(im.convert('RGBA')); a[:,:,3]=np.where(a[:,:,3]>=128,255,0); im=Image.fromarray(a); return im.crop(im.getbbox())
def down(im,w,h,colors=32):
    a=np.array(im).astype(np.float32)/255; pm=np.dstack([a[:,:,:3]*a[:,:,3:4],a[:,:,3:4]])
    s=np.array(Image.fromarray((pm*255).astype(np.uint8),'RGBA').resize((w,h),Image.BOX)).astype(np.float32)/255
    al=s[:,:,3:4]; col=np.where(al>0,s[:,:,:3]/np.maximum(al,1e-6),0)
    out=Image.fromarray((np.dstack([col,(al>=0.5)])*255).clip(0,255).astype(np.uint8),'RGBA')
    q=out.convert('RGB').quantize(colors=colors,method=Image.MEDIANCUT,dither=Image.NONE).convert('RGB')
    return Image.fromarray(np.dstack([np.array(q),np.array(out)[:,:,3]]).astype(np.uint8),'RGBA')
