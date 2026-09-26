import { configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { StorefrontProduct } from '@/api/types'
import { cartReducer } from '@/store/cartSlice'
import { ProductCard } from './ProductCard'

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
  createdAt: '2026-01-01T00:00:00Z',
}

function renderCard(value: StorefrontProduct = product) {
  const store = configureStore({ reducer: { cart: cartReducer } })

  const utils = render(
    <Provider store={store}>
      <MemoryRouter>
        <ProductCard product={value} />
      </MemoryRouter>
    </Provider>,
  )

  return { store, ...utils }
}

describe('ProductCard', () => {
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
})
