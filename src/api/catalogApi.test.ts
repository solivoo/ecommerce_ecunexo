import type { AxiosResponse } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import type { StorefrontFacets } from './types'
import { listStorefrontFacets, listStorefrontProducts } from './catalogApi'
import { api } from './client'

vi.mock('./client', () => ({ api: { get: vi.fn() } }))

const mockedGet = vi.mocked(api.get)

const emptyPage = { items: [], totalCount: 0, page: 1, pageSize: 24 }

const facets: StorefrontFacets = {
  attributes: [],
  priceMin: null,
  priceMax: null,
  inStockCount: 0,
  newCount: 0,
}

describe('catalogApi', () => {
  it('serializa facetas repetidas con URLSearchParams', async () => {
    mockedGet.mockResolvedValue({ data: emptyPage } as AxiosResponse)

    await listStorefrontProducts('tenant-1', {
      search: '  calcetin  ',
      sort: 'relevance',
      page: 2,
      pageSize: 24,
      talla: ['M', 'L'],
      color: ['Rojo'],
      priceMin: 3.5,
      priceMax: 12,
      inStock: true,
      isNew: true,
    })

    const [url, config] = mockedGet.mock.calls[0]
    const params = config?.params as URLSearchParams

    expect(url).toBe('/api/v1/public/tenants/tenant-1/storefront/products')
    expect(params).toBeInstanceOf(URLSearchParams)
    expect(params.getAll('talla')).toEqual(['M', 'L'])
    expect(params.getAll('color')).toEqual(['Rojo'])
    expect(params.get('search')).toBe('calcetin')
    expect(params.get('sort')).toBe('relevance')
    expect(params.get('page')).toBe('2')
    expect(params.get('priceMin')).toBe('3.5')
    expect(params.get('priceMax')).toBe('12')
    expect(params.get('inStock')).toBe('true')
    expect(params.get('new')).toBe('true')
  })

  it('omite los filtros vacíos', async () => {
    mockedGet.mockResolvedValue({ data: emptyPage } as AxiosResponse)

    await listStorefrontProducts('tenant-1', {
      talla: [],
      color: ['  '],
      inStock: false,
      isNew: false,
    })

    const params = mockedGet.mock.calls[0][1]?.params as URLSearchParams
    expect(params.has('talla')).toBe(false)
    expect(params.has('color')).toBe(false)
    expect(params.has('inStock')).toBe(false)
    expect(params.has('new')).toBe(false)
    expect(params.has('priceMin')).toBe(false)
    expect(params.has('search')).toBe(false)
  })

  it('consulta las facetas de la tienda', async () => {
    mockedGet.mockResolvedValue({ data: facets } as AxiosResponse)

    await expect(listStorefrontFacets('tenant-1')).resolves.toEqual(facets)
    expect(mockedGet.mock.calls[0][0]).toBe(
      '/api/v1/public/tenants/tenant-1/storefront/facets',
    )
  })
})
