// Madhukunj best sellers. Product imagery comes from the store's own artwork sheet.
export const SHEET_URL = '/madhukunj/images/sheet.webp';

export const SW = 3600;
export const SH = 3600;
export const BAR_ASPECT = 400 / 300; // product cell aspect, keeps artwork undistorted

export type CropBox = readonly [x: number, y: number, w: number, h: number];

export interface FlavorSpec {
  id: string;
  index: number;
  name: string;
  cardLines: readonly [string, string];
  box: CropBox;
  color: string;
  bit: number;
  ingredients: string;
  barcodeSeed: number;
  price: number;
  weight: string;
}

// Five best sellers. Boxes are cells of the 12-column / 300x400 Madhukunj sheet.
export const FLAVORS: readonly FlavorSpec[] = [
  {
    id: 'miracle-musk',
    index: 0,
    name: 'Miracle Musk',
    cardLines: ['MIRACLE', 'MUSK'],
    box: [1500, 400, 300, 400],
    color: '#8f7a68',
    bit: 0,
    ingredients: 'A deeper, oriental bambooless incense for the end of the day. Part of the Modern collection.',
    barcodeSeed: 104729,
    price: 200,
    weight: '80 G',
  },
  {
    id: 'miracle-sandal',
    index: 1,
    name: 'Miracle Sandal',
    cardLines: ['MIRACLE', 'SANDAL'],
    box: [1800, 400, 300, 400],
    color: '#a9885e',
    bit: 1,
    ingredients: 'Bambooless sandalwood incense for daily practice, meditation or a quiet corner of the home.',
    barcodeSeed: 208491,
    price: 200,
    weight: '80 G',
  },
  {
    id: 'miracle-mogra',
    index: 2,
    name: 'Miracle Mogra',
    cardLines: ['MIRACLE', 'MOGRA'],
    box: [2100, 400, 300, 400],
    color: '#b4b48c',
    bit: 2,
    ingredients: 'Bambooless incense built around mogra, the white jasmine-family flower. A clean floral note.',
    barcodeSeed: 319207,
    price: 200,
    weight: '80 G',
  },
  {
    id: 'pure-chandan',
    index: 3,
    name: 'Pure Chandan',
    cardLines: ['PURE', 'CHANDAN'],
    box: [2400, 400, 300, 400],
    color: '#c7a86a',
    bit: 3,
    ingredients: 'Sandalwood masala incense in a gold box. Warm, woody and familiar. Royal Heritage collection.',
    barcodeSeed: 427813,
    price: 200,
    weight: '80 G',
  },
  {
    id: 'pure-rose',
    index: 4,
    name: 'Pure Rose',
    cardLines: ['PURE', 'ROSE'],
    box: [2700, 400, 300, 400],
    color: '#b96b78',
    bit: 4,
    ingredients: 'The classic rose fragrance in a deep red box. A refined way to fill a room for puja or a slow evening.',
    barcodeSeed: 536149,
    price: 200,
    weight: '80 G',
  },
];

export const BITS: readonly CropBox[] = [
  [0, 0, 300, 400], // 0
  [300, 0, 300, 400], // 1
  [600, 0, 300, 400], // 2
  [3000, 400, 300, 400], // 3
  [3300, 400, 300, 400], // 4
];

export interface HeroBitLayout {
  x: number;
  y: number;
  size: number;
  rot: number;
  bit: number;
  hideOnPhone: boolean;
}

export const HERO_BITS: readonly HeroBitLayout[] = [
  { x: 0.12, y: 0.2, size: 96, rot: -18, bit: 0, hideOnPhone: false },
  { x: 0.86, y: 0.18, size: 80, rot: 22, bit: 2, hideOnPhone: true },
  { x: 0.07, y: 0.74, size: 72, rot: 12, bit: 3, hideOnPhone: false },
  { x: 0.655, y: 0.15, size: 66, rot: -10, bit: 4, hideOnPhone: true },
  { x: 0.205, y: 0.885, size: 60, rot: 30, bit: 1, hideOnPhone: true },
];

export interface InsideStepSpec {
  num: string;
  headLines: readonly string[] | null; // null means dynamic selected product name
  captionLines: readonly [string, string];
  ry: number;
}

export const INSIDE_STEPS: readonly InsideStepSpec[] = [
  {
    num: '01',
    headLines: ['REAL FRAGRANCE,', 'FIRST'],
    captionLines: ['Natural oils and powders.', 'Nothing you cannot say.'],
    ry: 0,
  },
  {
    num: '02',
    headLines: ['BLENDED,', 'NOT BURNT'],
    captionLines: ['Slow blended masala.', 'A clean, steady burn.'],
    ry: 180,
  },
  {
    num: '03',
    headLines: ['SEALED', 'FRESH'],
    captionLines: ['Packed the same day.', 'Fragrance that lasts.'],
    ry: 360,
  },
  {
    num: '04',
    headLines: null,
    captionLines: ['Long-lasting aroma.', 'Crafted in Kalinga.'],
    ry: 720,
  },
];

export interface NutritionRow {
  label: string;
  value: string;
  bold: boolean;
}

export const NUTRITION_ROWS: readonly NutritionRow[] = [
  { label: 'MRP', value: 'Rs. 200', bold: true },
  { label: 'Net quantity', value: '80 g', bold: true },
  { label: 'Type', value: 'Incense sticks', bold: false },
  { label: 'Bamboo', value: 'None', bold: false },
  { label: 'Origin', value: 'India', bold: false },
  { label: 'Collection', value: 'Modern / Royal', bold: false },
  { label: 'Care', value: '90400 08686', bold: false },
];

export const PACK_SLOTS: readonly { leftPct: number; topPct: number }[] = [
  { leftPct: 50.2, topPct: 37 },
  { leftPct: 34.8, topPct: 59.3 },
  { leftPct: 64.8, topPct: 59.3 },
];

export const INITIAL_FLAVOR_INDEX = 0;
