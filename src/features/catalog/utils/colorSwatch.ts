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

function normalizeColorName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function resolveColorHex(value: string): string | null {
  return COLOR_SWATCHES[normalizeColorName(value)] ?? null
}
