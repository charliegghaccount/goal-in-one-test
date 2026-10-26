"""Build labelled experimental-level review sheets (Pillow required)."""
import json,textwrap
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[1]/'docs'/'expansion-evidence'
rows=json.loads((root/'level-manifest.json').read_text())
font_path='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
for subset,cols,width,height,name in [(rows,4,1680,1800,'levels-21-40.jpg'),(rows[:10],2,1500,2100,'levels-21-30.jpg'),(rows[10:],2,1500,2100,'levels-31-40.jpg')]:
 cell=width//cols;cellh=height//((len(subset)+cols-1)//cols)
 sheet=Image.new('RGB',(width,height),'#e5f5ff');d=ImageDraw.Draw(sheet)
 title=ImageFont.truetype(font_path,16 if cols==4 else 20);small=ImageFont.truetype(font_path,12 if cols==4 else 15)
 for j,l in enumerate(subset):
  x=(j%cols)*cell+10;y=(j//cols)*cellh+8
  d.text((x,y),f"{l['id']} · {l['name']}",font=title,fill='#194b68');d.text((x,y+24),f"{l['mechanic']} · Par {l['par']}",font=small,fill='#246e91')
  im=Image.open(root/f"arena-{l['id']}.jpg");im.thumbnail((cell-20,cellh-122));sheet.paste(im,(x,y+48))
  for k,line in enumerate(textwrap.wrap(l['tip'],width=60 if cols==4 else 90)[:3]):d.text((x,y+cellh-67+k*17),line,font=small,fill='#294c59')
 sheet.save(root/name,quality=91,optimize=True)
