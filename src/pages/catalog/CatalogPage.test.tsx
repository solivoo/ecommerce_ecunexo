import { configureStore } from '@reduxjs/toolkit'
import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { StorefrontProduct } from '@/api/types'
import { catalogReducer } from '@/store/catalogSlice'
import { storefrontReducer } from '@/store/storefrontSlice'
import { uiReducer } from '@/store/uiSlice'
import { CatalogPage } from './CatalogPage'

vi.mock('@/api/catalogApi', () => ({
  listStorefrontProducts: vi.fn(),
  getStorefrontProduct: vi.fn(),
}))

import { listStorefrontProducts } from '@/api/catalogApi'

const mockedProducts = vi.mocked(listStorefrontProducts)

const product: StorefrontProduct = {
  id: 'p1',
  kind: 'physical',
  name: 'Calcetín Runner',
  description: null,
  price: 3.5,
  thumbUrl: null,
  mediumUrl: null,
  inStock: true,
  hasVariants: false,
  variantCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
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
      </MemoryRouter>
    </Provider>,
  )

  return store
}

describe('CatalogPage', () => {
  it('muestra los productos del catálogo', async () => {
    mockedProducts.mockResolvedValue({ items: [product], totalCount: 1, page: 1, pageSize: 24 })

    renderPage()

    expect(await screen.findByText('Calcetín Runner')).toBeInTheDocument()
    expect(screen.getByText('1 producto')).toBeInTheDocument()
  })

  it('lee los filtros desde la URL', async () => {
    mockedProducts.mockResolvedValue({ items: [], totalCount: 0, page: 2, pageSize: 24 })

    renderPage(['/?buscar=calcetin&pagina=2'])

    await waitFor(() => expect(mockedProducts).toHaveBeenCalled())

    expect(mockedProducts.mock.calls[0][0]).toBe('tenant-1')
    expect(mockedProducts.mock.calls[0][1]).toMatchObject({
      search: 'calcetin',
      page: 2,
    })
  })

  it('muestra el estado de error con opción de reintentar', async () => {
    mockedProducts.mockRejectedValue(new Error('Fallo total'))

    renderPage()

    expect(await screen.findByText('No se pudo cargar el catálogo')).toBeInTheDocument()
    expect(screen.getByText('Fallo total')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
