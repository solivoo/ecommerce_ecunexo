import { describe, expect, it } from 'vitest'
import type { StorefrontMatrixAxis, StorefrontVariant } from '@/api/types'
import {
  availableAxisValues,
  findVariant,
  initialSelection,
  isHexColor,
} from './variantSelection'

const axes: StorefrontMatrixAxis[] = [
  { name: 'Tallas', type: 'size', values: ['39-41', '42-44'], isPhotoGroup: false },
  { name: 'Color', type: 'color', values: ['#000000', '#ffffff'], isPhotoGroup: false },
]

function variant(id: string, talla: string, color: string, inStock: boolean): StorefrontVariant {
  return {
    id,
    name: `${talla} / ${color}`,
    sku: `SKU-${id}`,
    price: 3.5,
    inStock,
    availableQuantity: inStock ? 2 : 0,
    dimensions: { Tallas: talla, Color: color },
    mainImageThumbUrl: null,
    mainImageMediumUrl: null,
    imageInherited: false,
    imageInheritedFrom: null,
    images: null,
    extraColors: null,
  }
}

const variants: StorefrontVariant[] = [
  variant('v1', '39-41', '#000000', false),
  variant('v2', '39-41', '#ffffff', true),
  variant('v3', '42-44', '#000000', true),
]

describe('variantSelection', () => {
  it('inicia en la primera variante disponible', () => {
    const selection = initialSelection(variants, axes)
    expect(selection).toEqual({ Tallas: '39-41', Color: '#ffffff' })
  })

  it('resuelve la variante exacta', () => {
    expect(findVariant(variants, axes, { Tallas: '42-44', Color: '#000000' })?.id).toBe('v3')
    expect(findVariant(variants, axes, { Tallas: '42-44', Color: '#ffffff' })).toBeNull()
  })

  it('limita los valores del eje según la selección de los otros ejes', () => {
    const values = availableAxisValues(axes[0], axes, variants, {
      Tallas: '39-41',
      Color: '#000000',
    })
    expect(values).toEqual(['39-41', '42-44'])
  })

  it('detecta colores hexadecimales', () => {
    expect(isHexColor('#fff')).toBe(true)
    expect(isHexColor('#000000')).toBe(true)
    expect(isHexColor('Negro')).toBe(false)
  })
})
