import { describe, expect, it } from 'vitest'
import {
  classifyHexToColorName,
  isHexColorValue,
  resolveColorHex,
  resolveColorName,
} from './colorSwatch'

describe('colorSwatch', () => {
  it('identifica valores hexadecimales correctamente', () => {
    expect(isHexColorValue('#080808')).toBe(true)
    expect(isHexColorValue('#fff')).toBe(true)
    expect(isHexColorValue('#123456')).toBe(true)
    expect(isHexColorValue('Negro')).toBe(false)
    expect(isHexColorValue('red')).toBe(false)
  })

  it('clasifica códigos hexadecimales a familias de color estándar', () => {
    expect(classifyHexToColorName('#080808')).toBe('Negro')
    expect(classifyHexToColorName('#000000')).toBe('Negro')
    expect(classifyHexToColorName('#111111')).toBe('Negro')
    expect(classifyHexToColorName('#ffffff')).toBe('Blanco')
    expect(classifyHexToColorName('#2563eb')).toBe('Azul')
    expect(classifyHexToColorName('#38bdf8')).toBe('Celeste')
    expect(classifyHexToColorName('#9ca3af')).toBe('Gris')
    expect(classifyHexToColorName('#dc2626')).toBe('Rojo')
    expect(classifyHexToColorName('#16a34a')).toBe('Verde')
    expect(classifyHexToColorName('#facc15')).toBe('Amarillo')
    expect(classifyHexToColorName('#f97316')).toBe('Naranja')
    expect(classifyHexToColorName('#7c3aed')).toBe('Morado')
    expect(classifyHexToColorName('#7c4a21')).toBe('Café')
  })

  it('resolveColorName resuelve nombres y códigos hex a familias canónicas', () => {
    expect(resolveColorName('#080808')).toBe('Negro')
    expect(resolveColorName('#ffffff')).toBe('Blanco')
    expect(resolveColorName('negro')).toBe('Negro')
    expect(resolveColorName('blanco')).toBe('Blanco')
    expect(resolveColorName('azul')).toBe('Azul')
    expect(resolveColorName('cafe')).toBe('Cafe')
  })

  it('resolveColorHex devuelve el código hex para nombres conocidos o hex directos', () => {
    expect(resolveColorHex('negro')).toBe('#111111')
    expect(resolveColorHex('Negro')).toBe('#111111')
    expect(resolveColorHex('Blanco')).toBe('#ffffff')
    expect(resolveColorHex('#080808')).toBe('#080808')
    expect(resolveColorHex('desconocido')).toBeNull()
  })
})
