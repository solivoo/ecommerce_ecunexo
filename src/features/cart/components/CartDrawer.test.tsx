import { configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { formatPrice } from '@/lib/format'
import { cartReducer, type CartItem } from '@/store/cartSlice'
import { uiReducer } from '@/store/uiSlice'
import { CartDrawer } from './CartDrawer'

const items: CartItem[] = [
  {
    catalogItemId: 'p1',
    name: 'Calcetín Runner',
    sku: 'CALC-1',
    price: 3.5,
    quantity: 2,
    thumbUrl: null,
  },
  {
    catalogItemId: 'p2',
    name: 'Gorra',
    sku: null,
    price: 10,
    quantity: 1,
    thumbUrl: 'https://cdn/gorra.webp',
  },
]

function renderDrawer() {
  const store = configureStore({
    reducer: { cart: cartReducer, ui: uiReducer },
    preloadedState: {
      cart: { items, tenantId: 'tenant-1' },
      ui: { pendingHttp: 0, httpMessage: null, cartDrawerOpen: true, filterDrawerOpen: false },
    },
  })

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<CartDrawer />} />
          <Route path="/checkout" element={<p>Checkout listo</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )

  return store
}

describe('CartDrawer', () => {
  it('lista los ítems con su subtotal', () => {
    renderDrawer()

    expect(screen.getByRole('dialog', { name: 'Carrito de compras' })).toBeInTheDocument()
    expect(screen.getByText('Calcetín Runner')).toBeInTheDocument()
    expect(screen.getByText('SKU: CALC-1')).toBeInTheDocument()
    expect(screen.getByText('Gorra')).toBeInTheDocument()
    expect(screen.getByText(formatPrice(17))).toBeInTheDocument()
  })

  it('suma y resta cantidades respetando los límites', async () => {
    const store = renderDrawer()

    await userEvent.click(
      screen.getByRole('button', { name: 'Agregar una unidad de Calcetín Runner' }),
    )
    expect(store.getState().cart.items[0].quantity).toBe(3)
    expect(screen.getByText(formatPrice(20.5))).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'Quitar una unidad de Calcetín Runner' }),
    )
    expect(store.getState().cart.items[0].quantity).toBe(2)

    expect(
      screen.getByRole('button', { name: 'Quitar una unidad de Gorra' }),
    ).toBeDisabled()
  })

  it('elimina ítems del carrito', async () => {
    const store = renderDrawer()

    await userEvent.click(screen.getAllByRole('button', { name: 'Quitar' })[0])

    expect(store.getState().cart.items.map((item) => item.catalogItemId)).toEqual(['p2'])
    expect(screen.queryByText('Calcetín Runner')).not.toBeInTheDocument()
  })

  it('navega al checkout al ir a pagar y cierra el drawer', async () => {
    const store = renderDrawer()

    await userEvent.click(screen.getByRole('button', { name: 'Ir a pagar' }))

    expect(screen.getByText('Checkout listo')).toBeInTheDocument()
    expect(store.getState().ui.cartDrawerOpen).toBe(false)
  })

  it('cierra con la tecla Escape', async () => {
    const store = renderDrawer()

    await userEvent.keyboard('{Escape}')

    expect(store.getState().ui.cartDrawerOpen).toBe(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
