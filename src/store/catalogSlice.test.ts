import { configureStore } from '@reduxjs/toolkit'
import { describe, expect, it } from 'vitest'
import type { StorefrontFacets, StorefrontProduct } from '@/api/types'
import {
  catalogReducer,
  fetchFacets,
  fetchProducts,
  initialCatalogQuery,
  selectCatalogItems,
  selectFacets,
} from './catalogSlice'

const product: StorefrontProduct = {
  id: 'p1',
  kind: 'physical',
  name: 'Calcetín Runner',
  description: null,
  price: 3.5,
  thumbUrl: null,
  mediumUrl: null,
  secondMediumUrl: null,
  colors: [],
  inStock: true,
  hasVariants: false,
  variantCount: 0,
  isNew: false,
  createdAt: '2026-01-01T00:00:00Z',
}

const facets: StorefrontFacets = {
  attributes: [
    {
      key: 'talla',
      label: 'Talla',
      values: [{ value: 'M', label: 'M', count: 1 }],
    },
  ],
  priceMin: 3.5,
  priceMax: 3.5,
  inStockCount: 1,
  newCount: 0,
}

const page = { items: [product], totalCount: 1, page: 1, pageSize: 24 }

function createStore() {
  return configureStore({ reducer: { catalog: catalogReducer } })
}

describe('catalogSlice', () => {
  it('usa relevancia como orden por defecto', () => {
    expect(initialCatalogQuery.sort).toBe('relevance')
  })

  it('guarda la página al completar la carga', () => {
    const store = createStore()
    const query = { ...initialCatalogQuery }

    store.dispatch(fetchProducts.pending('req-1', query))
    expect(store.getState().catalog.productsStatus).toBe('loading')

    store.dispatch(fetchProducts.fulfilled({ page, query }, 'req-1', query))
    const state = store.getState().catalog
    expect(state.productsStatus).toBe('succeeded')
    expect(state.items).toEqual([product])
    expect(state.totalCount).toBe(1)
    expect(selectCatalogItems(store.getState())).toEqual([product])
  })

  it('ignora respuestas de solicitudes obsoletas', () => {
    const store = createStore()
    const first = { ...initialCatalogQuery, page: 1 }
    const second = { ...initialCatalogQuery, page: 2 }

    store.dispatch(fetchProducts.pending('req-1', first))
    store.dispatch(fetchProducts.pending('req-2', second))
    store.dispatch(fetchProducts.fulfilled({ page, query: first }, 'req-1', first))
    expect(store.getState().catalog.items).toEqual([])

    store.dispatch(
      fetchProducts.fulfilled({ page: { ...page, page: 2 }, query: second }, 'req-2', second),
    )
    expect(store.getState().catalog.appliedQuery.page).toBe(2)
    expect(store.getState().catalog.items).toEqual([product])
  })

  it('guarda el error de la última solicitud', () => {
    const store = createStore()

    store.dispatch(fetchProducts.pending('req-1', initialCatalogQuery))
    store.dispatch(fetchProducts.rejected(null, 'req-1', initialCatalogQuery, 'Sin conexión'))

    expect(store.getState().catalog.productsStatus).toBe('failed')
    expect(store.getState().catalog.productsError).toBe('Sin conexión')
  })

  it('guarda las facetas al completar la carga', () => {
    const store = createStore()

    store.dispatch(fetchFacets.pending('req-1', undefined))
    expect(store.getState().catalog.facetsStatus).toBe('loading')

    store.dispatch(fetchFacets.fulfilled(facets, 'req-1', undefined))
    expect(store.getState().catalog.facetsStatus).toBe('succeeded')
    expect(selectFacets(store.getState())).toEqual(facets)
  })

  it('vuelve a idle cuando se aborta la carga de facetas', () => {
    const store = createStore()

    store.dispatch(fetchFacets.pending('req-1', undefined))
    store.dispatch(
      fetchFacets.rejected(
        new DOMException('aborted', 'AbortError'),
        'req-1',
        undefined,
        undefined,
        { aborted: true },
      ),
    )

    expect(store.getState().catalog.facetsStatus).toBe('idle')
  })
})
