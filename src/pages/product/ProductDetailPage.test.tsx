import { configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StorefrontProductDetail, StorefrontVariant } from '@/api/types'
import { cartReducer } from '@/store/cartSlice'
import { productReducer } from '@/store/productSlice'
import { storefrontReducer } from '@/store/storefrontSlice'
import { uiReducer } from '@/store/uiSlice'
import { ProductDetailPage } from './ProductDetailPage'

vi.mock('@/api/catalogApi', () => ({
  listStorefrontProducts: vi.fn(),
  listStorefrontCategories: vi.fn(),
  getStorefrontProduct: vi.fn(),
  likeProduct: vi.fn(),
  unlikeProduct: vi.fn(),
}))

import { getStorefrontProduct, likeProduct } from '@/api/catalogApi'

const mockedGetProduct = vi.mocked(getStorefrontProduct)
const mockedLike = vi.mocked(likeProduct)

function buildVariant(
  id: string,
  talla: string,
  color: string,
  sku: string,
  price: number,
  inStock: boolean,
  imageUrl: string,
): StorefrontVariant {
  return {
    id,
    name: `${talla} / ${color}`,
    sku,
    price,
    inStock,
    availableQuantity: inStock ? 2 : 0,
    dimensions: { Tallas: talla, Color: color },
    mainImageThumbUrl: `${imageUrl}-thumb`,
    mainImageMediumUrl: `${imageUrl}-medium`,
    imageInherited: false,
    imageInheritedFrom: null,
    images: [
      {
        id: `${id}-img`,
        altText: null,
        isMain: true,
        thumbUrl: `${imageUrl}-thumb`,
        mediumUrl: `${imageUrl}-medium`,
        largeUrl: `${imageUrl}-large`,
      },
    ],
    extraColors: null,
  }
}

const detail: StorefrontProductDetail = {
  id: 'p1',
  kind: 'physical',
  name: 'Calcetín Runner',
  sku: 'CALC-MODELO',
  description: 'Algodón peinado',
  price: 3.5,
  inStock: true,
  availableQuantity: 4,
  images: [
    {
      id: 'model-img',
      altText: null,
      isMain: true,
      thumbUrl: 'https://cdn/model-thumb.webp',
      mediumUrl: 'https://cdn/model-medium.webp',
      largeUrl: 'https://cdn/model-large.webp',
    },
  ],
  variants: [
    buildVariant('v1', '39-41', '#000000', 'CALC-NEG-39', 3.5, true, 'https://cdn/negro'),
    buildVariant('v2', '42-44', '#000000', 'CALC-NEG-42', 4.25, false, 'https://cdn/negro42'),
    buildVariant('v3', '39-41', '#ffffff', 'CALC-BLA-39', 3.5, true, 'https://cdn/blanco'),
  ],
  matrix: {
    depth: 2,
    primaryAxis: 'Tallas',
    axes: [
      { name: 'Tallas', type: 'size', values: ['39-41', '42-44'], isPhotoGroup: false },
      { name: 'Color', type: 'color', values: ['#000000', '#ffffff'], isPhotoGroup: false },
    ],
    groupValues: [],
  },
  attributes: [{ level: 'Modelo', name: 'Marca', value: 'Nike' }],
  likeCount: 4,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
}

function renderPage() {
  const store = configureStore({
    reducer: {
      ui: uiReducer,
      storefront: storefrontReducer,
      product: productReducer,
      cart: cartReducer,
    },
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
      <MemoryRouter initialEntries={['/producto/p1']}>
        <Routes>
          <Route path="/producto/:productId" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )

  return store
}

describe('ProductDetailPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
  })

  it('muestra ficha, variante por defecto y especificaciones', async () => {
    mockedGetProduct.mockResolvedValue(detail)

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Calcetín Runner' })).toBeInTheDocument()
    expect(screen.getByText('SKU: CALC-NEG-39')).toBeInTheDocument()
    expect(screen.getByText('2 disponibles')).toBeInTheDocument()
    expect(screen.getByText('Marca')).toBeInTheDocument()
    expect(screen.getByText('Nike')).toBeInTheDocument()
    expect(screen.getByAltText('Calcetín Runner')).toHaveAttribute(
      'src',
      'https://cdn/negro-large',
    )
  })

  it('cambia de variante al elegir otra talla', async () => {
    mockedGetProduct.mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { name: 'Calcetín Runner' })
    await userEvent.click(screen.getByRole('button', { name: '42-44' }))

    expect(screen.getByText('SKU: CALC-NEG-42')).toBeInTheDocument()
    expect(screen.getByText('Agotado')).toBeInTheDocument()
    expect(screen.getByAltText('Calcetín Runner')).toHaveAttribute(
      'src',
      'https://cdn/negro42-large',
    )
  })

  it('cambia de variante al elegir un color', async () => {
    mockedGetProduct.mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { name: 'Calcetín Runner' })
    await userEvent.click(screen.getByRole('button', { name: 'Color: #ffffff' }))

    expect(screen.getByText('SKU: CALC-BLA-39')).toBeInTheDocument()
    expect(screen.getByAltText('Calcetín Runner')).toHaveAttribute(
      'src',
      'https://cdn/blanco-large',
    )
  })

  it('muestra SKU y atributos JSONB en productos simples', async () => {
    mockedGetProduct.mockResolvedValue({
      ...detail,
      sku: 'NIK002',
      variants: [],
      matrix: null,
      attributes: [
        { level: 'Ficha', name: 'Marca', value: 'Nike' },
        { level: 'Ficha', name: 'Color', value: '#EAB308' },
      ],
    })

    renderPage()

    await screen.findByRole('heading', { name: 'Calcetín Runner' })
    expect(screen.getByText('SKU: NIK002')).toBeInTheDocument()
    expect(screen.getByText('Nike')).toBeInTheDocument()
    expect(screen.getByText('#EAB308')).toBeInTheDocument()
  })

  it('muestra el estado no disponible', async () => {
    mockedGetProduct.mockRejectedValue(new Error('El producto no está disponible.'))

    renderPage()

    expect(await screen.findByText('Producto no disponible')).toBeInTheDocument()
    expect(screen.getByText('El producto no está disponible.')).toBeInTheDocument()
  })

  it('agrega al carrito la variante elegida con la cantidad seleccionada', async () => {
    mockedGetProduct.mockResolvedValue(detail)
    const store = renderPage()

    await screen.findByRole('heading', { name: 'Calcetín Runner' })
    await userEvent.click(screen.getByRole('button', { name: 'Aumentar cantidad' }))
    await userEvent.click(screen.getByRole('button', { name: 'Agregar al carrito' }))

    expect(store.getState().cart.items).toEqual([
      {
        catalogItemId: 'v1',
        name: 'Calcetín Runner',
        sku: 'CALC-NEG-39',
        price: 3.5,
        originalPrice: null,
        discountPercent: null,
        quantity: 2,
        thumbUrl: 'https://cdn/negro-thumb',
      },
    ])
    expect(screen.getByRole('status')).toHaveTextContent('se agregó al carrito')
  })

  it('deshabilita el botón cuando la variante está agotada', async () => {
    mockedGetProduct.mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { name: 'Calcetín Runner' })
    await userEvent.click(screen.getByRole('button', { name: '42-44' }))

    expect(screen.getByRole('button', { name: 'Agregar al carrito' })).toBeDisabled()
  })

  it('muestra el contador de likes y alterna con optimismo', async () => {
    mockedGetProduct.mockResolvedValue(detail)
    mockedLike.mockResolvedValue({ liked: true, likeCount: 5 })

    renderPage()

    await screen.findByRole('heading', { name: 'Calcetín Runner' })
    const heart = screen.getByRole('button', { name: 'Me gusta' })
    expect(heart).toHaveTextContent('4')

    await userEvent.click(heart)

    expect(await screen.findByRole('button', { name: 'Quitar me gusta' })).toHaveTextContent('5')
    expect(mockedLike).toHaveBeenCalledWith('tenant-1', 'p1', expect.any(String))
  })
})
