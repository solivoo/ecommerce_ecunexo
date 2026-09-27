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
  morado: '#7c3aed',
  naranja: '#f97316',
}

const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

function normalizeColorName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
