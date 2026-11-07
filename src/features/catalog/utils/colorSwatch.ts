const COLOR_SWATCHES: Record<string, string> = {
  negro: '#111111',
  blanco: '#ffffff',
  rojo: '#dc2626',
  azul: '#2563eb',
  celeste: '#38bdf8',
  verde: '#16a34a',
  amarillo: '#facc15',
  rosa: '#ec4899',
  gris: '#9ca3af',
  beige: '#d6c7ae',
  marron: '#7c4a21',
  cafe: '#7c4a21',
  morado: '#7c3aed',
  naranja: '#f97316',
  lila: '#8b5cf6',
  violeta: '#7c3aed',
  turquesa: '#14b8a6',
  dorado: '#d4a017',
  plateado: '#c0c0c0',
  crema: '#f5f0e1',
  fucsia: '#d946ef',
  coral: '#ff7f50',
  oliva: '#708238',
  vino: '#722f37',
}

const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

function normalizeColorName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const HEX_TO_COLOR_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(COLOR_SWATCHES).map(([name, hex]) => [hex.toLowerCase(), name]),
)

function parseHexRgb(hex: string): [number, number, number] | null {
  const clean = hex.startsWith('#') ? hex.slice(1).trim() : hex.trim()
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16)
    const g = parseInt(clean[1] + clean[1], 16)
    const b = parseInt(clean[2] + clean[2], 16)
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : [r, g, b]
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16)
    const g = parseInt(clean.slice(2, 4), 16)
    const b = parseInt(clean.slice(4, 6), 16)
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : [r, g, b]
  }
  return null
}

export function classifyHexToColorName(hex: string): string | null {
  const rgb = parseHexRgb(hex)
  if (!rgb) return null

  const [rByte, gByte, bByte] = rgb
  const r = rByte / 255
  const g = gByte / 255
  const b = bByte / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const l = (max + min) / 2

  if (l <= 0.18) {
    return 'Negro'
  }

  const s = delta <= 0.0001 ? 0 : delta / (1 - Math.abs(2 * l - 1))
  if (l >= 0.88 && s <= 0.25) {
    return 'Blanco'
  }

  if (s <= 0.12) {
    return 'Gris'
  }

  let h: number
  if (Math.abs(max - r) < 0.0001) {
    h = 60 * (((g - b) / delta) % 6)
  } else if (Math.abs(max - g) < 0.0001) {
    h = 60 * ((b - r) / delta + 2)
  } else {
    h = 60 * ((r - g) / delta + 4)
  }

  if (h < 0) {
    h += 360
  }

  if (h < 12 || h >= 345) {
    return l >= 0.65 ? 'Rosa' : 'Rojo'
  }
  if (h >= 12 && h < 42) {
    return l < 0.45 && s < 0.7 ? 'Café' : l > 0.72 && s < 0.45 ? 'Beige' : 'Naranja'
  }
  if (h >= 42 && h < 68) {
    return l > 0.72 && s < 0.45 ? 'Beige' : 'Amarillo'
  }
  if (h >= 68 && h < 165) {
    return 'Verde'
  }
  if (h >= 165 && h < 205) {
    return 'Celeste'
  }
  if (h >= 205 && h < 260) {
    return l >= 0.65 ? 'Celeste' : 'Azul'
  }
  if (h >= 260 && h < 310) {
    return 'Morado'
  }
  return 'Rosa'
}

/** Resuelve un hex o nombre a un nombre de familia de color conocido (capitalizado), o null. */
export function resolveColorName(value: string): string | null {
  const trimmed = value.trim()
  if (HEX_COLOR_PATTERN.test(trimmed)) {
    return classifyHexToColorName(trimmed)
  }
  const name = HEX_TO_COLOR_NAME[trimmed.toLowerCase()]
  if (name) {
    return name.charAt(0).toUpperCase() + name.slice(1)
  }
  const normalized = normalizeColorName(trimmed)
  if (COLOR_SWATCHES[normalized]) {
    return normalized.charAt(0).toUpperCase() + normalized.slice(1)
  }
  return null
}

/** Resuelve un color a hex: acepta nombres conocidos y valores hex directos. */
export function resolveColorHex(value: string): string | null {
  const trimmed = value.trim()
  if (HEX_COLOR_PATTERN.test(trimmed)) {
    return trimmed
  }

  return COLOR_SWATCHES[normalizeColorName(trimmed)] ?? null
}

/** True cuando el valor es un código hex (no debe mostrarse como texto). */
export function isHexColorValue(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value.trim())
}
