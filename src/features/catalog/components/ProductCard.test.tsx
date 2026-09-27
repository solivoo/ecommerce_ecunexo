import { configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StorefrontProduct } from '@/api/types'
import { cartReducer } from '@/store/cartSlice'
import { storefrontReducer } from '@/store/storefrontSlice'
import { ProductCard } from './ProductCard'

vi.mock('@/api/catalogApi', () => ({
  likeProduct: vi.fn(),
  unlikeProduct: vi.fn(),
}))

import { likeProduct, unlikeProduct } from '@/api/catalogApi'

const mockedLike = vi.mocked(likeProduct)
const mockedUnlike = vi.mocked(unlikeProduct)

const product: StorefrontProduct = {
  id: 'p1',
  kind: 'physical',
  name: 'Calcetín Runner',
  description: null,
  price: 3.5,
  thumbUrl: null,
  mediumUrl: 'https://cdn/main.webp',
  secondMediumUrl: 'https://cdn/second.webp',
  colors: ['Negro', 'Blanco', 'Rojo', 'Azul', 'Verde', 'Morado'],
  inStock: true,
  hasVariants: false,
  variantCount: 0,
  isNew: true,
  likeCount: 2,
  createdAt: '2026-01-01T00:00:00Z',
}

function LocationProbe() {
  const location = useLocation()
  return <span data-testid="location">{location.pathname}</span>
}

function renderCard(value: StorefrontProduct = product) {
  const store = configureStore({
    reducer: { cart: cartReducer, storefront: storefrontReducer },
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

  const utils = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/']}>
        <LocationProbe />
        <Routes>
          <Route path="/" element={<ProductCard product={value} />} />
          <Route path="/producto/:productId" element={<div>Ficha de producto</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )

  return { store, ...utils }
}

describe('ProductCard', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
  })

  it('muestra el badge Nuevo y los swatches limitados a cinco', () => {
    renderCard()

    expect(screen.getByText('Nuevo')).toBeInTheDocument()
    expect(screen.getByTitle('Negro')).toBeInTheDocument()
    expect(screen.getByTitle('Blanco')).toBeInTheDocument()
    expect(screen.getByTitle('Verde')).toBeInTheDocument()
    expect(screen.queryByTitle('Morado')).not.toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  it('apila la segunda imagen junto a la principal', () => {
    const { container } = renderCard()

    const images = container.querySelectorAll('img')
    expect(images).toHaveLength(2)
    expect(images[0]).toHaveAttribute('src', 'https://cdn/main.webp')
    expect(images[1]).toHaveAttribute('src', 'https://cdn/second.webp')
  })

  it('no muestra badge ni swatches cuando no aplica', () => {
    const { container } = renderCard({
      ...product,
      isNew: false,
      colors: [],
      secondMediumUrl: null,
    })

    expect(screen.queryByText('Nuevo')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Colores disponibles')).not.toBeInTheDocument()
    expect(container.querySelectorAll('img')).toHaveLength(1)
  })

  it('agrega al carrito los productos simples disponibles', async () => {
    const { store } = renderCard()

    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(store.getState().cart.items).toEqual([
      {
        catalogItemId: 'p1',
        name: 'Calcetín Runner',
        sku: null,
        price: 3.5,
        quantity: 1,
        thumbUrl: null,
      },
    ])
  })

  it('muestra Elegir opciones con enlace a la ficha cuando hay variantes', () => {
    renderCard({ ...product, hasVariants: true, variantCount: 3, price: null })

    const cta = screen.getByRole('link', { name: 'Elegir opciones' })
    expect(cta).toHaveAttribute('href', '/producto/p1')
    expect(screen.queryByRole('button', { name: 'Agregar' })).not.toBeInTheDocument()
  })

  it('deshabilita la compra cuando el producto está agotado', async () => {
    const { store } = renderCard({ ...product, inStock: false })

    const cta = screen.getByRole('button', { name: 'Agotado' })
    expect(cta).toBeDisabled()

    await userEvent.click(cta)
    expect(store.getState().cart.items).toEqual([])
  })

  it('da like con optimismo, muestra el contador y no navega', async () => {
    mockedLike.mockResolvedValue({ liked: true, likeCount: 3 })
    renderCard()

    const heart = screen.getByRole('button', { name: 'Me gusta' })
    expect(heart).toHaveTextContent('2')

    await userEvent.click(heart)

    expect(await screen.findByRole('button', { name: 'Quitar me gusta' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Quitar me gusta' })).toHaveTextContent('3')
    expect(screen.getByTestId('location')).toHaveTextContent('/')
    expect(screen.queryByText('Ficha de producto')).not.toBeInTheDocument()
    expect(mockedLike).toHaveBeenCalledWith('tenant-1', 'p1', expect.any(String))
    expect(JSON.parse(window.localStorage.getItem('ecunexo.likes.v1')!)).toContain('p1')
  })

  it('quita el like con optimismo y lo persiste', async () => {
    window.localStorage.setItem('ecunexo.visitor.v1', 'visitor-12345678')
    window.localStorage.setItem('ecunexo.likes.v1', JSON.stringify(['p1']))
    mockedUnlike.mockResolvedValue({ liked: false, likeCount: 1 })
    renderCard()

    await userEvent.click(screen.getByRole('button', { name: 'Quitar me gusta' }))

    expect(await screen.findByRole('button', { name: 'Me gusta' })).toHaveTextContent('1')
    expect(JSON.parse(window.localStorage.getItem('ecunexo.likes.v1')!)).not.toContain('p1')
    expect(mockedUnlike).toHaveBeenCalledWith('tenant-1', 'p1', 'visitor-12345678')
  })

  it('revierte el like si la API falla', async () => {
    mockedLike.mockRejectedValue(new Error('Demasiadas solicitudes'))
    renderCard()

    await userEvent.click(screen.getByRole('button', { name: 'Me gusta' }))

    expect(await screen.findByRole('button', { name: 'Me gusta' })).toHaveTextContent('2')
    expect(JSON.parse(window.localStorage.getItem('ecunexo.likes.v1')!)).not.toContain('p1')
  })
})
