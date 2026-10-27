"""Assemble unaltered browser captures for the Studio V2 review (requires Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parents[1] / 'docs' / 'studio-v2-evidence'
items = [
    ('Campaign: stable identities, ordering and publication', 'campaign-collection.jpg'),
    ('Eight anchored handles on a rotated block', 'resizing-rotated.jpg'),
    ('Editable arena corners and whole wall segments', 'boundary-and-handles.jpg'),
    ('Shared diagonal motion preview and speed controls', 'diagonal-path-preview.jpg'),
    ('Spring launch direction, set with the visual arrow', 'spring-direction.jpg'),
    ('Gate opening offset and separate movement durations', 'gate-offset-controls.jpg'),
]
width, height, label = 680, 473, 36
sheet = Image.new('RGB', (width * 2, (height + label) * 3), '#eaf2ef')
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 17)
draw = ImageDraw.Draw(sheet)
for i, (title, name) in enumerate(items):
    x, y = (i % 2) * width, (i // 2) * (height + label)
    capture = Image.open(root / name).convert('RGB')
    capture.thumbnail((width, height), Image.Resampling.LANCZOS)
    sheet.paste(capture, (x, y + label))
    draw.text((x + 12, y + 9), title, fill='#183f46', font=font)
sheet.save(root / 'studio-overview.jpg', quality=88, optimize=True)
print(root / 'studio-overview.jpg')
