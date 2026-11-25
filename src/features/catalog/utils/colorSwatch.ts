import type { StorefrontColor } from '@/api/types'

/**
 * Búsqueda sobre la paleta de colores nombrados del tenant (nombre + hex).
 * La paleta llega de la API: la tienda no inventa colores ni traduce nombres.
 */
export interface ColorPaletteLookup {
  hexFor: (name: string) => string | null
  nameForHex: (hex: string) => string | null
}

export function createColorPaletteLookup(palette: readonly StorefrontColor[]): ColorPaletteLookup {
  const byName = new Map<string, StorefrontColor>()
  const byHex = new Map<string, string>()

  for (const color of palette) {
    byName.set(color.name.trim().toLowerCase(), color)
    byHex.set(color.hex.trim().toLowerCase(), color.name)
  }

  return {
    hexFor: (name) => byName.get(name.trim().toLowerCase())?.hex ?? null,
    nameForHex: (hex) => byHex.get(hex.trim().toLowerCase()) ?? null,
  }
}
