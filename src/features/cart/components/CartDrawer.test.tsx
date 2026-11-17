import { configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { formatPrice } from '@/lib/format'
import { cartReducer, type CartItem } from '@/store/cartSlice'
import { storefrontReducer } from '@/store/storefrontSlice'
import { uiReducer } from '@/store/uiSlice'
import { CartDrawer } from './CartDrawer'

vi.mock('@/api/checkoutApi', () => ({
  getCheckoutOptions: vi.fn(),
  calculateStorefrontQuote: vi.fn(),
}))

import { calculateStorefrontQuote, getCheckoutOptions } from '@/api/checkoutApi'

const mockedGetCheckoutOptions = vi.mocked(getCheckoutOptions)
const mockedCalculateStorefrontQuote = vi.mocked(calculateStorefrontQuote)

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

function renderDrawer(overrides: { items?: CartItem[]; withTenant?: boolean } = {}) {
  const cartState = { items: overrides.items ?? items, tenantId: 'tenant-1' }
  const uiState = {
    pendingHttp: 0,
    httpMessage: null,
    cartDrawerOpen: true,
    filterDrawerOpen: false,
  }

  const store = overrides.withTenant
    ? configureStore({
        reducer: { cart: cartReducer, ui: uiReducer, storefront: storefrontReducer },
        preloadedState: {
          cart: cartState,
          ui: uiState,
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
    : configureStore({
        reducer: { cart: cartReducer, ui: uiReducer },
        preloadedState: { cart: cartState, ui: uiState },
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
  beforeEach(() => {
    vi.clearAllMocks()
  })
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

  it('bloquea "Ir a pagar" si un ítem está por debajo de su compra mínima', async () => {
    mockedGetCheckoutOptions.mockResolvedValue({
      paymentMethods: [],
      shippingMethods: [],
      minOrderAmount: null,
    })

    renderDrawer({
      withTenant: true,
      items: [
        {
          catalogItemId: 'p1',
          name: 'Calcetín Runner',
          sku: 'CALC-1',
          price: 3.5,
          quantity: 2,
          thumbUrl: null,
          minOrderQuantity: 4,
        },
      ],
    })

    expect(await screen.findByText('Mínimo 4 por producto.')).toBeInTheDocument()
    expect(screen.getByText('Hay productos por debajo de su compra mínima.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir a pagar' })).toBeDisabled()
  })

  it('bloquea "Ir a pagar" si el subtotal no alcanza el pedido mínimo', async () => {
    mockedGetCheckoutOptions.mockResolvedValue({
      paymentMethods: [],
      shippingMethods: [],
      minOrderAmount: 50,
    })

    renderDrawer({ withTenant: true })

    expect(
      await screen.findByText(`El pedido mínimo es ${formatPrice(50)}.`),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir a pagar' })).toBeDisabled()
  })

  it('permite "Ir a pagar" cuando se cumple el mínimo', async () => {
    mockedGetCheckoutOptions.mockResolvedValue({
      paymentMethods: [],
      shippingMethods: [],
      minOrderAmount: 10,
    })

    renderDrawer({ withTenant: true })

    const button = screen.getByRole('button', { name: 'Ir a pagar' })
    expect(button).toBeEnabled()
  })

  it('muestra descuento por paquete/promo y subtotal cotizado por el backend', async () => {
    mockedGetCheckoutOptions.mockResolvedValue({
      paymentMethods: [],
      shippingMethods: [],
      minOrderAmount: null,
    })
    mockedCalculateStorefrontQuote.mockResolvedValue({
      items: [
        {
          catalogItemId: 'p1',
          quantity: 2,
          listUnitPrice: 3.5,
          effectiveUnitPrice: 3,
          lineGross: 7,
          lineDiscount: 1,
          lineSubtotalExTax: 5.22,
          lineTaxAmount: 0.78,
          lineTotal: 6,
          discountPercent: 14,
        },
        {
          catalogItemId: 'p2',
          quantity: 3,
          listUnitPrice: 4,
          effectiveUnitPrice: 3,
          lineGross: 12,
          lineDiscount: 3,
          lineSubtotalExTax: 7.83,
          lineTaxAmount: 1.17,
          lineTotal: 9,
          discountPercent: 25,
        },
      ],
      grossSubtotal: 19,
      promotionDiscountAmount: 4,
      couponDiscountAmount: 0,
      discountAmount: 4,
      subtotal: 13.05,
      taxRate: 0.15,
      taxAmount: 1.95,
      pricesIncludeTax: true,
      shippingCost: 0,
      totalAmount: 15,
      couponApplied: false,
    })

    renderDrawer({ withTenant: true })

    expect(await screen.findByText('Descuento paquetes / promo')).toBeInTheDocument()
    expect(screen.getByText(`-${formatPrice(4)}`)).toBeInTheDocument()
    expect(screen.getByText(formatPrice(15))).toBeInTheDocument()
  })

  it('muestra error de mínimo de grupo y bloquea "Ir a pagar" si falla la cotización', async () => {
    mockedGetCheckoutOptions.mockResolvedValue({
      paymentMethods: [],
      shippingMethods: [],
      minOrderAmount: null,
    })
    mockedCalculateStorefrontQuote.mockRejectedValue(
      new Error('El grupo «Pack Calcetines» requiere una compra mínima de 5 unidades.'),
    )

    renderDrawer({ withTenant: true })

    expect(
      await screen.findByText('El grupo «Pack Calcetines» requiere una compra mínima de 5 unidades.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir a pagar' })).toBeDisabled()
  })
})
