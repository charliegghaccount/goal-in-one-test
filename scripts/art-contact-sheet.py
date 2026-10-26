"""Rebuild Park & Treeline review sheets from browser captures (requires Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw
root = Path(__file__).resolve().parents[1] / 'docs' / 'park-evidence'
for start, count, columns, width, row_height, filename in [
    (1, 20, 4, 1600, 320, 'all-20-levels.jpg'),
    (1, 10, 2, 1400, 370, 'levels-1-10.jpg'),
    (11, 10, 2, 1400, 370, 'levels-11-20.jpg'),
]:
    cell = width // columns
    sheet = Image.new('RGB', (width, ((count + columns - 1)//columns)*row_height), '#e4f5ff')
    draw = ImageDraw.Draw(sheet)
    for j, level in enumerate(range(start, start + count)):
        picture = Image.open(root / f'arena-{level}.jpg')
        picture.thumbnail((cell-20, row_height-40))
        x, y = (j % columns)*cell + 10, (j // columns)*row_height + 32
        sheet.paste(picture, (x, y))
        draw.text((x, y-20), f'LEVEL {level:02}', fill='#204661')
    sheet.save(root / filename, quality=92, optimize=True)
sheet = Image.new('RGB', (1400, 1060), '#e4f5ff')
draw = ImageDraw.Draw(sheet)
for j, path in enumerate([root/'before/menu.png', root/'menu.jpg']):
    picture = Image.open(path)
    picture.thumbnail((690, 1000))
    sheet.paste(picture, (j*700+5, 35))
    draw.text((j*700+10, 10), 'BEFORE' if j == 0 else 'PARK & TREELINE', fill='#204661')
sheet.save(root/'before-after-menu.jpg', quality=90, optimize=True)
