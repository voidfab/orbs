// Colour ramps.
//
// Upstream painted every dot as `rgba(g,g,g,a)` where `g` was the dot's ink
// value mapped straight to an sRGB grey level. That made tinting impossible
// and allocated one template string per dot per frame (~34k strings/sec/orb
// on composing@64).
//
// Here a dot's ink value indexes a RAMP instead. The contract is uniform and
// backwards-compatible: **the ramp is indexed by the sRGB grey level it
// replaces** — ramp(0) is the darkest ink, ramp(1) the lightest/brightest.
// So the `mono` palette is a plain black→white ramp and reproduces upstream.
//
// Ramps interpolate in OkLab, not sRGB. Lerping saturated greens in sRGB
// drags midpoints through a muddy olive; OkLab keeps them on the hue.
// Interpolation happens ONCE at build time into a LUT, so the canvas only
// ever sees plain `rgba()` strings — upstream's "identical pixels in every
// browser" guarantee survives (no `oklch()` in fillStyle, no filters).

/** One ramp stop. `at` is the ink level in [0,1]; `hex` is `#rrggbb`. */
export interface Stop {
  at: number;
  hex: string;
}

/** A ramp: stops in ascending `at` order. Must span at least 0 and 1. */
export type Ramp = readonly Stop[];

/**
 * Interpolation space.
 *
 * `oklab` is perceptually even and what you want for saturated hues — lerping
 * greens in sRGB drags midpoints through a muddy olive.
 *
 * `srgb` exists because upstream's grayscale was defined as a straight sRGB
 * byte ramp (`g = ink * 255`). OkLab-lerping black→white is perceptually even
 * but lands ~29/255 off that curve at the midpoint, so `mono` must interpolate
 * in sRGB to actually reproduce it.
 */
export type RampSpace = 'oklab' | 'srgb';

/** A palette carries one ramp per substrate — inverting a hue's lightness
 *  does not produce a usable light-mode ramp, so they're authored separately. */
export interface Palette {
  dark: Ramp;
  light: Ramp;
  /** @default 'oklab' */
  space?: RampSpace;
}

export type PaletteName =
  | 'green'
  | 'mono'
  | 'twoTone'
  | 'nebula'
  | 'callisto'
  | 'voice'
  | 'live'
  | 'iris'
  | 'neon'
  | 'broadcast'
  | 'stardust'
  | 'graphite'
  | 'slate'
  | 'paper'
  | 'ember'
  | 'sunset'
  | 'aurora'
  | 'ocean'
  | 'arctic'
  | 'ai-gradient'
  | 'mint'
  | 'synthwave'
  | 'cyberpunk'
  | 'matrix'
  | 'macaron'
  | 'fog'
  | 'forest'
  | 'moss'
  | 'desert'
  | 'holiday'
  | 'midnight';

// --- Nowah brand ramps -------------------------------------------------
// Anchored on nowah/constants/design-tokens.ts:16-19. The brightest (most
// salient) dots land on #1FD08A, which those tokens document as the
// AA-passing green for small marks — #00A86B explicitly does not pass at
// icon size, and the 20px inline orb IS icon size.

const GREEN: Palette = {
  dark: [
    { at: 0.0, hex: '#04231A' }, // deep jade, sits just off the background
    { at: 0.3, hex: '#008754' }, // COLORS.primaryActive
    { at: 0.55, hex: '#00A86B' }, // COLORS.primary — the brand green
    { at: 0.8, hex: '#1FD08A' }, // COLORS.accentBright
    { at: 1.0, hex: '#9BF5CE' } // light jade highlight
  ],
  light: [
    { at: 0.0, hex: '#00563A' }, // darkest ink = most salient on light
    { at: 0.35, hex: '#00794E' },
    { at: 0.6, hex: '#00A86B' },
    { at: 1.0, hex: '#B8E8D2' }
  ]
};

// --- Nebula brand ramps ------------------------------------------------
// From https://www.nebula.gg brand assets:
//   - Icon glyph fill: #f312a4 (hot magenta / pink) — primary brand ink
//   - Site accent purple-500: #ac4bff (used on marketing UI, secondary)
//   - Icon plate: #faf5ff (soft lilac wash)
// Dark ramp: deep plum → brand pink → hot highlight.
// Light ramp: saturated pink is the dark (salient) ink on pale lilac grounds.

const NEBULA: Palette = {
  dark: [
    { at: 0.0, hex: '#2A061C' }, // deep plum, sits just off a near-black bg
    { at: 0.28, hex: '#8B0A5E' }, // wine / mid magenta
    { at: 0.55, hex: '#F312A4' }, // brand pink — icon glyph
    { at: 0.78, hex: '#FF5CC8' }, // hot pink highlight
    { at: 1.0, hex: '#FFB8E8' } // soft lilac tip
  ],
  light: [
    { at: 0.0, hex: '#9B0870' }, // darkest ink = most salient on light
    { at: 0.35, hex: '#D10E90' },
    { at: 0.6, hex: '#F312A4' }, // brand pink
    { at: 0.85, hex: '#AC4BFF' }, // marketing purple accent
    { at: 1.0, hex: '#F5D0FF' } // pale lilac (near #faf5ff plate)
  ]
};

/** Upstream grayscale. sRGB space, so it reproduces `g = ink * 255` exactly. */
const MONO: Palette = {
  space: 'srgb',
  dark: [
    { at: 0.0, hex: '#000000' },
    { at: 1.0, hex: '#FFFFFF' }
  ],
  light: [
    { at: 0.0, hex: '#000000' },
    { at: 1.0, hex: '#FFFFFF' }
  ]
};

/** Green reads as a highlight on a neutral base. */
const TWO_TONE: Palette = {
  dark: [
    { at: 0.0, hex: '#2A2A2C' },
    { at: 0.45, hex: '#4A5551' },
    { at: 0.72, hex: '#00A86B' },
    { at: 1.0, hex: '#1FD08A' }
  ],
  light: [
    { at: 0.0, hex: '#00563A' },
    { at: 0.3, hex: '#00A86B' },
    { at: 0.65, hex: '#9BA1A6' },
    { at: 1.0, hex: '#E4E4E7' }
  ]
};

/** Two-stop same-hue ramp from the colorized fork's ink/fade pairs. */
function hueRamp(lightInk: string, lightFade: string, darkInk: string, darkFade: string): Palette {
  return {
    dark: [
      { at: 0, hex: darkFade },
      { at: 1, hex: darkInk }
    ],
    light: [
      { at: 0, hex: lightInk },
      { at: 1, hex: lightFade }
    ]
  };
}

const CURATED: Record<
  Exclude<
    PaletteName,
    'green' | 'mono' | 'twoTone' | 'nebula' | 'callisto' | 'voice' | 'live' | 'iris' | 'neon' | 'broadcast' | 'stardust'
  >,
  Palette
> = {
  graphite: hueRamp('#454a54', '#eaeaeb', '#afb5c0', '#1f2023'),
  slate: hueRamp('#385275', '#e8eaee', '#97b2d8', '#1a2028'),
  paper: hueRamp('#725b3b', '#f6f5f4', '#ebe2d6', '#2d251b'),
  ember: hueRamp('#8b3d23', '#f0e8e6', '#f4997b', '#2e1b14'),
  sunset: hueRamp('#8b5323', '#f0eae6', '#f4b47b', '#2e2014'),
  aurora: hueRamp('#238b68', '#e6f0ec', '#7bf4cc', '#142e26'),
  ocean: hueRamp('#23578b', '#e6ebf0', '#7bb8f4', '#14212e'),
  arctic: hueRamp('#297ea3', '#e6edf0', '#7bd0f4', '#14262e'),
  'ai-gradient': hueRamp('#53238b', '#eae6f0', '#b47bf4', '#20142e'),
  mint: hueRamp('#238b5a', '#e6f0eb', '#7bf4bc', '#142e22'),
  synthwave: hueRamp('#8b2376', '#f0e6ee', '#f47bdc', '#2e1429'),
  cyberpunk: hueRamp('#8b238b', '#f0e6f0', '#f47bf4', '#2e142e'),
  matrix: hueRamp('#238b23', '#e6f0e6', '#7bf47b', '#142e14'),
  macaron: hueRamp('#7b324b', '#f5f0f1', '#df90ab', '#2a181e'),
  fog: hueRamp('#546978', '#eef0f1', '#a8bac7', '#242a2e'),
  forest: hueRamp('#238b3d', '#e6f0e8', '#7bf499', '#142e1b'),
  moss: hueRamp('#5f8b23', '#ebf0e6', '#c2f47b', '#232e14'),
  desert: hueRamp('#8b6523', '#f0ece6', '#f4c87b', '#2e2514'),
  holiday: hueRamp('#8b2331', '#f0e6e7', '#f47b8b', '#2e1417'),
  midnight: hueRamp('#23238b', '#e6e6f0', '#9797f7', '#14142e')
};

const CALLISTO: Palette = {
  dark: [
    { at: 0, hex: '#06141C' },
    { at: 0.45, hex: '#2A6B6A' },
    { at: 0.78, hex: '#E8B48A' },
    { at: 1, hex: '#F4E6C8' }
  ],
  light: [
    { at: 0, hex: '#1A3A48' },
    { at: 0.5, hex: '#C9895A' },
    { at: 1, hex: '#F3EDE4' }
  ]
};

const VOICE: Palette = {
  dark: [
    { at: 0, hex: '#1B2238' },
    { at: 0.4, hex: '#0EA5E9' },
    { at: 0.72, hex: '#7C3AED' },
    { at: 1, hex: '#F0ABFC' }
  ],
  light: [
    { at: 0, hex: '#3B4770' },
    { at: 0.45, hex: '#0284C7' },
    { at: 0.75, hex: '#6D28D9' },
    { at: 1, hex: '#F5D0FE' }
  ]
};

/** Hermes / ChatGPT Live — white core into periwinkle rim. */
const LIVE: Palette = {
  dark: [
    { at: 0, hex: '#1A2740' },
    { at: 0.38, hex: '#5F91EB' },
    { at: 0.72, hex: '#B4D2FF' },
    { at: 1, hex: '#EBF2FF' }
  ],
  light: [
    { at: 0, hex: '#3A5A9A' },
    { at: 0.5, hex: '#5F91EB' },
    { at: 1, hex: '#EBF2FF' }
  ]
};

export const PALETTES: Record<PaletteName, Palette> = {
  green: GREEN,
  mono: MONO,
  twoTone: TWO_TONE,
  nebula: NEBULA,
  callisto: CALLISTO,
  voice: VOICE,
  live: LIVE,
  iris: {
    dark: [
      { at: 0, hex: '#1e1b4b' },
      { at: 0.5, hex: '#818cf8' },
      { at: 1, hex: '#22d3ee' }
    ],
    light: [
      { at: 0, hex: '#4338ca' },
      { at: 1, hex: '#a5f3fc' }
    ]
  },
  neon: {
    dark: [
      { at: 0, hex: '#083344' },
      { at: 0.5, hex: '#22d3ee' },
      { at: 1, hex: '#d946ef' }
    ],
    light: [
      { at: 0, hex: '#0e7490' },
      { at: 1, hex: '#f0abfc' }
    ]
  },
  broadcast: {
    dark: [
      { at: 0, hex: '#020404' },
      { at: 0.45, hex: '#00a98a' },
      { at: 1, hex: '#00e5c0' }
    ],
    light: [
      { at: 0, hex: '#006655' },
      { at: 1, hex: '#eef3fa' }
    ]
  },
  stardust: {
    dark: [
      { at: 0, hex: '#1a2050' },
      { at: 0.4, hex: '#5f7cff' },
      { at: 0.72, hex: '#ff5566' },
      { at: 1, hex: '#ffa23c' }
    ],
    light: [
      { at: 0, hex: '#35459e' },
      { at: 0.55, hex: '#aac6ff' },
      { at: 1, hex: '#ffa23c' }
    ]
  },
  ...CURATED
};

const extraPalettes = new Map<string, Palette>();

/** Register a custom named palette. `mono` is reserved. */
export function registerPalette(name: string, palette: Palette): void {
  if (name === 'mono') {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[thinking-orbs] `mono` is reserved and cannot be overridden');
    }
    return;
  }
  extraPalettes.set(name, palette);
}

function mixHex(a: [number, number, number], b: [number, number, number], t: number): string {
  const h = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  const r = a[0] + (b[0] - a[0]) * t;
  const g = a[1] + (b[1] - a[1]) * t;
  const bl = a[2] + (b[2] - a[2]) * t;
  return `#${h(r)}${h(g)}${h(bl)}`;
}

function parseHex(hex: string): [number, number, number] | null {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length !== 6) return null;
  const n = Number.parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Derive dual light/dark ramps from a CSS hex (colorized-fork shorthand). */
export function paletteFromCss(hex: string): Palette | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const white: [number, number, number] = [255, 255, 255];
  const black: [number, number, number] = [0, 0, 0];
  return {
    light: [
      { at: 0, hex: hex.startsWith('#') ? hex : `#${hex}` },
      { at: 1, hex: mixHex(rgb, white, 0.88) }
    ],
    dark: [
      { at: 0, hex: mixHex(rgb, black, 0.85) },
      { at: 1, hex: mixHex(rgb, white, 0.38) }
    ]
  };
}

export const PALETTE_NAMES = Object.keys(PALETTES) as PaletteName[];

// --- sRGB <-> OkLab ----------------------------------------------------
// Björn Ottosson's OkLab. https://bottosson.github.io/posts/oklab/

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
}

type Lab = [number, number, number];

function hexToLab(hex: string): Lab {
  const h = hex.replace('#', '');
  const r = srgbToLinear(Number.parseInt(h.slice(0, 2), 16) / 255);
  const g = srgbToLinear(Number.parseInt(h.slice(2, 4), 16) / 255);
  const b = srgbToLinear(Number.parseInt(h.slice(4, 6), 16) / 255);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  ];
}

/** OkLab → sRGB bytes, gamut-clamped per channel. */
function labToRgb(lab: Lab): [number, number, number] {
  const [L, A, B] = lab;
  const l_ = L + 0.3963377774 * A + 0.2158037573 * B;
  const m_ = L - 0.1055613458 * A - 0.0638541728 * B;
  const s_ = L - 0.0894841775 * A - 1.291485548 * B;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(linearToSrgb(v) * 255)));
  return [clamp(r), clamp(g), clamp(b)];
}

// --- LUT ---------------------------------------------------------------
// Ink is quantised to L_LEVELS and alpha to A_LEVELS. 6 bits of ink and 5 of
// alpha are imperceptible on 1-3px dots, and the coarse buckets are what let
// the painter coalesce runs of identical fillStyle (see render/canvas2d.ts).
// Finer buckets would shorten those runs and give back the win.

export const L_LEVELS = 64;
export const A_LEVELS = 32;

export interface RampLut {
  /** L_LEVELS × 3 sRGB bytes. */
  rgb: Uint8Array;
  /** Lazily-filled `rgba()` strings, indexed L_LEVELS × A_LEVELS. */
  styles: Array<string | undefined>;
}

function hexToBytes(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16)
  ];
}

function buildLut(ramp: Ramp, space: RampSpace): RampLut {
  const oklab = space !== 'srgb';
  const nodes = ramp.map((s) => (oklab ? hexToLab(s.hex) : hexToBytes(s.hex)));
  const rgb = new Uint8Array(L_LEVELS * 3);

  for (let i = 0; i < L_LEVELS; i++) {
    const at = i / (L_LEVELS - 1);

    // locate the bracketing stops
    let hi = 1;
    while (hi < ramp.length - 1 && ramp[hi].at < at) hi++;
    const lo = hi - 1;
    const span = ramp[hi].at - ramp[lo].at;
    const f = span > 0 ? Math.max(0, Math.min(1, (at - ramp[lo].at) / span)) : 0;

    const a = nodes[lo];
    const b = nodes[hi];
    const mixed: [number, number, number] = [
      a[0] + (b[0] - a[0]) * f,
      a[1] + (b[1] - a[1]) * f,
      a[2] + (b[2] - a[2]) * f
    ];
    const [r, g, bl] = oklab
      ? labToRgb(mixed)
      : [Math.round(mixed[0]), Math.round(mixed[1]), Math.round(mixed[2])];
    rgb[i * 3] = r;
    rgb[i * 3 + 1] = g;
    rgb[i * 3 + 2] = bl;
  }

  return { rgb, styles: new Array(L_LEVELS * A_LEVELS) };
}

// Memoised per resolved ramp. Keyed by identity for the built-in palettes and
// by serialised stops for custom ramps, so a caller passing a fresh array
// literal every render doesn't rebuild the LUT each frame.
const lutCache = new Map<string, RampLut>();
const lutByRef = new WeakMap<object, RampLut>();

function rampKey(ramp: Ramp, space: RampSpace): string {
  let k = `${space}|`;
  for (const s of ramp) k += `${s.at}:${s.hex};`;
  return k;
}

function lutFor(ramp: Ramp, space: RampSpace): RampLut {
  const byRef = lutByRef.get(ramp as unknown as object);
  if (byRef) return byRef;
  const key = rampKey(ramp, space);
  let hit = lutCache.get(key);
  if (!hit) {
    hit = buildLut(ramp, space);
    lutCache.set(key, hit);
  }
  lutByRef.set(ramp as unknown as object, hit);
  return hit;
}

/** Resolve (palette | custom ramp, substrate) to a memoised LUT. */
export function getLut(
  palette: PaletteName | Palette | string,
  dark: boolean,
  custom?: Ramp,
  space?: RampSpace
): RampLut {
  if (custom) return lutFor(custom, space ?? 'oklab');
  let pal: Palette;
  if (typeof palette !== 'string') {
    pal = palette;
  } else if (PALETTES[palette as PaletteName]) {
    pal = PALETTES[palette as PaletteName];
  } else if (extraPalettes.has(palette)) {
    pal = extraPalettes.get(palette)!;
  } else {
    const derived = paletteFromCss(palette);
    pal = derived ?? PALETTES.mono;
    if (!derived && process.env.NODE_ENV !== 'production') {
      console.warn(`[thinking-orbs] unknown palette "${palette}"; falling back to mono`);
    }
  }
  return lutFor(dark ? pal.dark : pal.light, space ?? pal.space ?? 'oklab');
}

/** Bucketed `rgba()` string for an (ink, alpha) pair. Cached in the LUT. */
export function styleFor(lut: RampLut, lBucket: number, aBucket: number): string {
  const idx = lBucket * A_LEVELS + aBucket;
  const hit = lut.styles[idx];
  if (hit !== undefined) return hit;
  const o = lBucket * 3;
  const alpha = aBucket / (A_LEVELS - 1);
  // 3 decimals is plenty and keeps the strings short
  const s = `rgba(${lut.rgb[o]},${lut.rgb[o + 1]},${lut.rgb[o + 2]},${Math.round(alpha * 1000) / 1000})`;
  lut.styles[idx] = s;
  return s;
}
