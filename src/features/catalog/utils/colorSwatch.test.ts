import { describe, expect, it } from 'vitest'
import { createColorPaletteLookup } from './colorSwatch'

const palette = [
  { name: 'Rosado', hex: '#FFAAEC' },
  { name: 'Verde claro', hex: '#A8D770' },
  { name: 'Azul Marino', hex: '#38578A' },
]

describe('createColorPaletteLookup', () => {
  const lookup = createColorPaletteLookup(palette)

  it('devuelve el hex de la paleta sin importar mayúsculas', () => {
    expect(lookup.hexFor('Rosado')).toBe('#FFAAEC')
    expect(lookup.hexFor('verde CLARO')).toBe('#A8D770')
  })

  it('no inventa colores que no están en la paleta', () => {
    expect(lookup.hexFor('Rosa')).toBeNull()
    expect(lookup.hexFor('Verde')).toBeNull()
  })

  it('resuelve el nombre de la paleta a partir de un hex', () => {
    expect(lookup.nameForHex('#38578a')).toBe('Azul Marino')
    expect(lookup.nameForHex('#000000')).toBeNull()
  })
})
