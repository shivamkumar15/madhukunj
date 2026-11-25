#!/usr/bin/env python3
"""Build the app catalog (src/data/prints.ts + public/images/sheet.webp) from the scrape."""
import glob
import html
import json
import os
import re

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

SCRAPE = '/home/dranzer/Downloads/madhukunj_scrape'
OUT = '/home/dranzer/Downloads/madhukunj'
COLS, ROWS = 12, 9
CELL_W, CELL_H = 300, 400

products = json.load(open(os.path.join(SCRAPE, 'products.json'), encoding='utf-8'))
details = json.load(open(os.path.join(SCRAPE, 'product_details.json'), encoding='utf-8'))
offers = details['offers']
images = glob.glob(os.path.join(SCRAPE, 'images', '*'))


def image_for(handle):
    matches = [f for f in images if os.path.basename(f).startswith(handle + '_')]
    if not matches:
        return None
    def pos(f):
        m = re.search(r'_(\d+)\.', os.path.basename(f))
        return int(m.group(1)) if m else 99
    return min(matches, key=pos)


def plain(text):
    text = re.sub(r'<br\s*/?>', ' ', text or '', flags=re.I)
    text = re.sub(r'</p>', ' ', text, flags=re.I)
    text = re.sub(r'<[^>]+>', '', text)
    text = html.unescape(text)
    return re.sub(r'\s+', ' ', text).strip()


os.makedirs(os.path.join(OUT, 'public', 'images', 'products'), exist_ok=True)
sheet = Image.new('RGB', (COLS * CELL_W, ROWS * CELL_H), 'white')
entries = []
for i, p in enumerate(products):
    path = image_for(p['handle'])
    image_url = None
    fit = 'cover'
    if path:
        im = Image.open(path).convert('RGB')
        x, y = (i % COLS) * CELL_W, (i // COLS) * CELL_H
        wide = im.width / im.height > 1.05
        # Full-resolution copy for DOM cards/detail; the sheet stays for WebGL.
        full = im.copy()
        full.thumbnail((1000, 1000), Image.LANCZOS)
        filename = p['handle'] + '.webp'
        full.save(os.path.join(OUT, 'public', 'images', 'products', filename),
                  'WEBP', quality=84, method=4)
        image_url = '/images/products/' + filename
        fit = 'contain' if wide else 'cover'
        if wide:
            # Wide combo shots: show the whole pack over a soft blurred backdrop.
            bg = im.copy()
            scale = max(CELL_W / bg.width, CELL_H / bg.height)
            bg = bg.resize(
                (max(CELL_W, round(bg.width * scale)), max(CELL_H, round(bg.height * scale))),
                Image.LANCZOS,
            )
            bg = bg.crop(((bg.width - CELL_W) // 2, (bg.height - CELL_H) // 2,
                          (bg.width - CELL_W) // 2 + CELL_W, (bg.height - CELL_H) // 2 + CELL_H))
            bg = ImageEnhance.Brightness(bg.filter(ImageFilter.GaussianBlur(18))).enhance(0.82)
            sheet.paste(bg, (x, y))

            im.thumbnail((CELL_W, CELL_H), Image.LANCZOS)
            sheet.paste(im, (x + (CELL_W - im.width) // 2, y + (CELL_H - im.height) // 2))
        else:
            scale = max(CELL_W / im.width, CELL_H / im.height)
            im = im.resize(
                (max(CELL_W, round(im.width * scale)), max(CELL_H, round(im.height * scale))),
                Image.LANCZOS,
            )
            left = (im.width - CELL_W) // 2
            top = (im.height - CELL_H) // 2
            sheet.paste(im.crop((left, top, left + CELL_W, top + CELL_H)), (x, y))
    else:
        d = ImageDraw.Draw(sheet)
        x, y = (i % COLS) * CELL_W, (i // COLS) * CELL_H
        d.rectangle([x, y, x + CELL_W, y + CELL_H], fill='#F6EAD8')
        d.text((x + 16, y + CELL_H // 2), p['title'][:34], fill='#3A3550')

    variants = []
    for v in p.get('variants', []):
        label = v.get('option1') or v.get('title') or 'Default'
        try:
            price = float(v['price'])
        except (TypeError, ValueError, KeyError):
            price = 0
        variants.append({'label': label, 'price': price})

    specs = details['products'].get(p['handle'], {}).get('specs', [])
    entries.append({
        'id': i,
        'title': p['title'],
        'productType': p.get('product_type') or 'Incense',
        'price': variants[0]['price'] if variants else 0,
        'description': plain(p.get('body_html')),
        'variants': variants,
        'specs': specs,
        'image': image_url,
        'fit': fit,
    })

os.makedirs(os.path.join(OUT, 'public', 'images', 'products'), exist_ok=True)
sheet.save(os.path.join(OUT, 'public', 'images', 'sheet.webp'), 'WEBP', quality=90, method=4)


def js(value):
    return json.dumps(value, ensure_ascii=False)


lines = [
    "// Generated from madhukunj.co.in and madhukunj_scrape/ — run scripts/build_catalog.py.",
    "export const ARTWORK_SHEET_URL = '/images/sheet.webp';",
    "",
    f"export const SHEET_WIDTH = {COLS * CELL_W};",
    f"export const SHEET_HEIGHT = {ROWS * CELL_H};",
    f"export const SHEET_COLUMNS = {COLS};",
    f"export const CELL_WIDTH = {CELL_W};",
    f"export const CELL_HEIGHT = {CELL_H};",
    "",
    "export interface ProductVariant {",
    "  label: string;",
    "  price: number;",
    "}",
    "",
    "export interface ProductSpec {",
    "  label: string;",
    "  value: string;",
    "}",
    "",
    "export interface PrintItem {",
    "  id: number;",
    "  title: string;",
    "  productType: string;",
    "  price: number;",
    "  description: string;",
    "  variants: readonly ProductVariant[];",
    "  specs: readonly ProductSpec[];",
    "  image: string | null;",
    "  fit: 'cover' | 'contain';",
    "}",
    "",
    "export const PRINTS: readonly PrintItem[] = [",
]
for e in entries:
    vars_ = ', '.join(
        "{ label: %s, price: %s }" % (js(v['label']), js(v['price']))
        for v in e['variants']
    )
    specs_ = ', '.join(
        "{ label: %s, value: %s }" % (js(s['label']), js(s['value']))
        for s in e['specs']
    )
    lines += [
        "  {",
        "    id: %d," % e['id'],
        "    title: %s," % js(e['title']),
        "    productType: %s," % js(e['productType']),
        "    price: %s," % js(e['price']),
        "    description: %s," % js(e['description']),
        "    variants: [%s]," % vars_,
        "    specs: [%s]," % specs_,
        "    image: %s," % js(e['image']),
        "    fit: %s," % js(e['fit']),
        "  },",
    ]
lines.append("];")
lines += [
    "",
    "export const STORE_OFFERS: readonly string[] = [",
    *["  %s," % js(o) for o in offers],
    "];",
    "",
    "export interface AccordionItem {",
    "  id: string;",
    "  title: string;",
    "  body: string;",
    "}",
    "",
    "export const ACCORDION_ITEMS: readonly AccordionItem[] = [",
    "  { id: 'shipping', title: 'Shipping', body: 'Orders are packed within 1-2 business days and shipped across India via Shiprocket. Delivery usually takes 3-7 business days. A tracking link is sent once dispatched.' },",
    "  { id: 'returns', title: 'Refund & Returns', body: 'Unopened, unused items in original packaging can be returned within 7 days of delivery. Opened incense cannot be returned for hygiene reasons. Damaged or wrong items: contact us within 48 hours with photos.' },",
    "  { id: 'privacy', title: 'Privacy', body: 'We collect only the details needed to fulfil your order. Payments are handled by Razorpay and shipping by Shiprocket. We never sell your personal data. Governed by India\\'s DPDP Act, 2023.' },",
    "  { id: 'terms', title: 'Terms of Service', body: 'Prices are in INR and include applicable taxes. Orders are confirmed on payment or placement for Cash on Delivery. All content belongs to Madhukunj / Shri Balaji Incense Industries. Governing law: India, with courts in Odisha.' },",
    "];",
    "",
    "export type CurrencyCode = 'INR';",
    "",
    "export const CURRENCY_META: Record<CurrencyCode, { symbol: string; rate: number }> = {",
    "  INR: { symbol: '₹', rate: 1 },",
    "};",
    "",
]

with open(os.path.join(OUT, 'src', 'data', 'prints.ts'), 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print('products:', len(entries), 'offers:', len(offers))
