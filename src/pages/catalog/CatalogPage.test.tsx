import { configureStore } from '@reduxjs/toolkit'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { StorefrontFacets, StorefrontProduct } from '@/api/types'
import { catalogReducer } from '@/store/catalogSlice'
import { storefrontReducer } from '@/store/storefrontSlice'
import { uiReducer } from '@/store/uiSlice'
import { CatalogPage } from './CatalogPage'

vi.mock('@/api/catalogApi', () => ({
  listStorefrontProducts: vi.fn(),
  listStorefrontFacets: vi.fn(),
}))

import { listStorefrontFacets, listStorefrontProducts } from '@/api/catalogApi'

const mockedProducts = vi.mocked(listStorefrontProducts)
const mockedFacets = vi.mocked(listStorefrontFacets)

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
      values: [
        { value: 'M', label: 'M', count: 3 },
        { value: 'L', label: 'L', count: 1 },
      ],
    },
  ],
  priceMin: 3.5,
  priceMax: 12,
  inStockCount: 4,
  newCount: 2,
}

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

function renderPage(initialEntries: string[] = ['/']) {
  const store = configureStore({
    reducer: { ui: uiReducer, storefront: storefrontReducer, catalog: catalogReducer },
    preloadedState: {
      storefront: {
        config: {
          tenantId: 'tenant-1',
          name: 'Tienda Demo',
          logoUrl: null,
          primaryColorHex: null,
          locale: 'es-EC',
          currency: 'USD',
        },
        status: 'succeeded' as const,
        error: null,
      },
    },
  })

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        <CatalogPage />
        <LocationDisplay />
      </MemoryRouter>
    </Provider>,
  )

  return store
}

describe('CatalogPage', () => {
  it('muestra los productos del catálogo', async () => {
    mockedProducts.mockResolvedValue({ items: [product], totalCount: 1, page: 1, pageSize: 24 })
    mockedFacets.mockResolvedValue(facets)

    renderPage()

    expect(await screen.findByText('Calcetín Runner')).toBeInTheDocument()
    expect(screen.getByText('1 producto')).toBeInTheDocument()
  })

  it('lee los filtros desde la URL', async () => {
    mockedProducts.mockResolvedValue({ items: [], totalCount: 0, page: 2, pageSize: 24 })
    mockedFacets.mockResolvedValue(facets)

    renderPage(['/?buscar=calcetin&pagina=2'])

    await waitFor(() => expect(mockedProducts).toHaveBeenCalled())

    expect(mockedProducts.mock.calls[0][0]).toBe('tenant-1')
    expect(mockedProducts.mock.calls[0][1]).toMatchObject({
      search: 'calcetin',
      page: 2,
    })
  })

  it('muestra las facetas con su contador', async () => {
    mockedProducts.mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 24 })
    mockedFacets.mockResolvedValue(facets)

    renderPage()

    expect(await screen.findByText('Talla')).toBeInTheDocument()
    expect(await screen.findByRole('checkbox', { name: /M\s*3/ })).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Rango disponible: $3,50 – $12,00')).toBeInTheDocument()
  })

  it('aplicar un filtro actualiza la URL y la llamada al API', async () => {
    mockedProducts.mockResolvedValue({ items: [product], totalCount: 1, page: 1, pageSize: 24 })
    mockedFacets.mockResolvedValue(facets)

    renderPage()

    await userEvent.click(await screen.findByRole('checkbox', { name: /M\s*3/ }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('talla=M')
    })
    await waitFor(() => {
      expect(mockedProducts.mock.calls.at(-1)?.[1]).toMatchObject({ talla: ['M'] })
    })
  })

  it('quitar un chip limpia el filtro', async () => {
    mockedProducts.mockResolvedValue({ items: [product], totalCount: 1, page: 1, pageSize: 24 })
    mockedFacets.mockResolvedValue(facets)

    renderPage(['/?talla=M'])

    await userEvent.click(await screen.findByRole('button', { name: /Talla: M/ }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).not.toHaveTextContent('talla=')
    })
    await waitFor(() => {
      expect(mockedProducts.mock.calls.at(-1)?.[1]?.talla).toBeUndefined()
    })
  })

  it('abre y cierra el panel de filtros con el botón Filtrar', async () => {
    mockedProducts.mockResolvedValue({ items: [product], totalCount: 1, page: 1, pageSize: 24 })
    mockedFacets.mockResolvedValue(facets)

    renderPage()

    const filterButton = await screen.findByRole('button', { name: 'Filtrar' })
    expect(filterButton).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(filterButton)
    expect(filterButton).toHaveAttribute('aria-expanded', 'true')
    expect(filterButton).toHaveAttribute('aria-controls', 'catalog-filters')

    await userEvent.keyboard('{Escape}')
    expect(filterButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('muestra el estado de error con opción de reintentar', async () => {
    mockedProducts.mockRejectedValue(new Error('Fallo total'))
    mockedFacets.mockResolvedValue(facets)

    renderPage()

    expect(await screen.findByText('No se pudo cargar el catálogo')).toBeInTheDocument()
    expect(screen.getByText('Fallo total')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
