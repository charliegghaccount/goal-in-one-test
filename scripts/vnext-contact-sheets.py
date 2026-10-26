"""Compose only actual browser captures. Requires Pillow; no game or PDF geometry is redrawn."""
from pathlib import Path
import json
import sys
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parents[1]
out = root / 'docs/vnext-evidence'
levels = json.loads((root / 'docs/specifications/vnext/Goal_In_One_Levels_41-60.json').read_text())['levels']
results = {x['id']: x for x in json.loads((out / 'browser-results.json').read_text())}
font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def font(n):
    return ImageFont.truetype(font_path, n)
def fit(sheet, file, x, y, w, h):
    im = Image.open(file).convert('RGB')
    # Trim only letterboxed margins in overview thumbnails. Raw screenshots remain untouched.
    if file.stem.startswith('overview-'):
        level = next(l for l in levels if l['id'] == int(file.stem.split('-')[-1]))
        xs = [p['x'] for p in level['outline']] + [level['goal']['x'] + level['goal']['w']]
        ys = [p['y'] for p in level['outline']] + [level['goal']['y']]
        ww = max(xs) - min(xs) + 48; hh = max(ys) - min(ys) + 56
        scale = min(im.width / ww, im.height / hh)
        pad_x = (im.width - ww*scale)/2; pad_y = (im.height - hh*scale)/2
        im = im.crop((round(pad_x),round(pad_y),round(im.width-pad_x),round(im.height-pad_y)))
    im.thumbnail((w, h), Image.Resampling.LANCZOS)
    sheet.paste(im, (x + (w-im.width)//2, y + (h-im.height)//2))
def contact(items, columns, name):
    tilew, tileh = 700, 315
    rows = (len(items)+columns-1)//columns
    sheet = Image.new('RGB',(tilew*columns,rows*tileh+70),'#e8f2eb')
    d=ImageDraw.Draw(sheet)
    d.text((20,15),'GOAL IN ONE · LEVELS 41–60 · BROWSER CAPTURES',font=font(24),fill='#173b35')
    for i,l in enumerate(items):
        x=(i%columns)*tilew; y=(i//columns)*tileh+70
        d.text((x+16,y),f"{l['id']:02}  {l['name']}",font=font(22),fill='#173b35')
        fit(sheet,out/f"overview-{l['id']}.jpg",x+10,y+32,tilew-20,235)
        mode='FIXED' if l['camera']['mode']=='fixed' else l['camera']['mode'].upper()
        d.text((x+16,y+277),f"{mode}  ·  PAR {l['par']}  ·  VERIFIED {results[l['id']]['shots']} KICKS",font=font(15),fill='#315a4c')
    sheet.save(out/name,quality=91)
contact(levels,4,'levels-41-60.jpg')
contact(levels[:12],2,'levels-41-52.jpg')
contact(levels[12:],2,'levels-53-60.jpg')
# Each scrolling map has an overview and actual ball-following regional views.
for l in levels[12:]:
    id=l['id']; files=[(out/f'overview-{id}.jpg','Full arena · paused map'),(out/f'start-{id}.jpg','Starting area')]
    files += [(p,f"Tracking view {p.stem.split('-')[-1]}") for p in sorted(out.glob(f'section-{id}-*.jpg'))]
    files += [(out/f'goal-area-{id}.jpg','Physical goal entry')]
    w,h=1100,325; sheet=Image.new('RGB',(w,len(files)*h+60),'#e8f2eb');d=ImageDraw.Draw(sheet)
    d.text((16,12),f"{id}  {l['name']} · camera review",font=font(25),fill='#173b35')
    for n,(f,label) in enumerate(files):
        y=60+n*h;d.text((16,y),label,font=font(18),fill='#173b35');fit(sheet,f,12,y+26,w-24,h-35)
    sheet.save(out/f'camera-{id}.jpg',quality=90)
print('Generated three level contact sheets and eight scrolling camera sheets.')

# Optional side-by-side comparison with pdftoppm -scale-to 1000 PNG pages.
if len(sys.argv)>1:
    pages=Path(sys.argv[1])
    for start in [41,51]:
        items=[l for l in levels if start<=l['id']<start+10]
        sheet=Image.new('RGB',(1400,2830),'#e8f2eb');d=ImageDraw.Draw(sheet)
        d.text((16,10),'SUPPLIED PDF / ACTUAL BROWSER OVERVIEW',font=font(24),fill='#173b35')
        for i,l in enumerate(items):
            x=i%2*700; y=i//2*555+55
            id=l['id']; page=id-37 if id<=52 else 16+(id-53)*2
            d.text((x+14,y),f"{id}  {l['name']}",font=font(21),fill='#173b35')
            ref=Image.open(pages/f'page-{page:02}.png').crop((45,128,955,413))
            ref.thumbnail((670,225),Image.Resampling.LANCZOS)
            sheet.paste(ref,(x+(700-ref.width)//2,y+30))
            d.text((x+14,y+250),'ACTUAL CAPTURE',font=font(14),fill='#315a4c')
            fit(sheet,out/f'overview-{id}.jpg',x+10,y+275,680,265)
        sheet.save(out/f'pdf-comparison-{start}-{start+9}.jpg',quality=90)
