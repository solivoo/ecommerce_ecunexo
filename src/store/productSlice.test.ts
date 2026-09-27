import { configureStore } from '@reduxjs/toolkit'
import { describe, expect, it } from 'vitest'
import type { StorefrontProductDetail } from '@/api/types'
import {
  clearProduct,
  fetchProduct,
  productReducer,
  selectProduct,
  selectProductStatus,
} from './productSlice'

const detail: StorefrontProductDetail = {
  id: 'p1',
  kind: 'physical',
  name: 'Calcetín Runner',
  sku: 'CALC-MODELO',
  description: null,
  price: 3.5,
  inStock: true,
  availableQuantity: 3,
  images: [],
  variants: [],
  matrix: null,
  attributes: [],
  likeCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
}

function createStore() {
  return configureStore({ reducer: { product: productReducer } })
}

describe('productSlice', () => {
  it('carga el detalle del producto', () => {
    const store = createStore()

    store.dispatch(fetchProduct.pending('req-1', 'p1'))
    expect(selectProductStatus(store.getState())).toBe('loading')

    store.dispatch(fetchProduct.fulfilled(detail, 'req-1', 'p1'))
    expect(selectProduct(store.getState())).toEqual(detail)
    expect(selectProductStatus(store.getState())).toBe('succeeded')
  })

  it('ignora respuestas de solicitudes obsoletas', () => {
    const store = createStore()

    store.dispatch(fetchProduct.pending('req-1', 'p1'))
    store.dispatch(fetchProduct.pending('req-2', 'p2'))
    store.dispatch(fetchProduct.fulfilled(detail, 'req-1', 'p1'))

    expect(selectProduct(store.getState())).toBeNull()

    store.dispatch(fetchProduct.fulfilled({ ...detail, id: 'p2' }, 'req-2', 'p2'))
    expect(selectProduct(store.getState())!.id).toBe('p2')
  })

  it('guarda el error de la última solicitud', () => {
    const store = createStore()

    store.dispatch(fetchProduct.pending('req-1', 'p1'))
    store.dispatch(fetchProduct.rejected(null, 'req-1', 'p1', 'Producto no disponible.'))

    expect(selectProductStatus(store.getState())).toBe('failed')
    expect(store.getState().product.error).toBe('Producto no disponible.')
  })

  it('limpia el detalle', () => {
    const store = createStore()
    store.dispatch(fetchProduct.pending('req-1', 'p1'))
    store.dispatch(fetchProduct.fulfilled(detail, 'req-1', 'p1'))

    store.dispatch(clearProduct())

    expect(selectProduct(store.getState())).toBeNull()
    expect(selectProductStatus(store.getState())).toBe('idle')
  })
})
