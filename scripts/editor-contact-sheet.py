"""Assemble actual UI captures for review; requires Pillow, not a game dependency."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parents[1] / 'docs/editor-evidence'
items = [('editor-spring-route.jpg', 'Visual construction and editable perimeter'),
         ('polygon-colliders.jpg', 'Concave polygon / vertex editing'),
         ('mechanic-library.jpg', 'Native mechanics and collision overlay'),
         ('draft-goal.jpg', 'Actual drag-input goal in Test Mode'),
         ('exploring-shaft.jpg', 'Free exploration of a scrolling arena'),
         ('mobile-pinch.jpg', 'Landscape touch pan and pinch')]
w, h = 900, 610
sheet = Image.new('RGB', (w*2, h*3+55), '#eaf2ef')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 21)
draw.text((15,12), 'GOAL IN ONE — LEVEL STUDIO & EXPLORATION', font=font, fill='#183f46')
for i,(file,label) in enumerate(items):
    x=i%2*w; y=i//2*h+55
    draw.text((x+12,y+5),label,font=font,fill='#183f46')
    image=Image.open(root/file);image.thumbnail((w-20,h-50),Image.Resampling.LANCZOS)
    sheet.paste(image,(x+(w-image.width)//2,y+40+(h-50-image.height)//2))
sheet.save(root/'editor-overview.jpg',quality=90)
