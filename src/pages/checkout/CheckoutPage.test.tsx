import { configureStore } from '@reduxjs/toolkit'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CheckoutOptions, StorefrontOrderResult } from '@/api/types'
import { formatPrice } from '@/lib/format'
import { cartReducer, type CartItem } from '@/store/cartSlice'
import { storefrontReducer } from '@/store/storefrontSlice'
import { uiReducer } from '@/store/uiSlice'
import { CheckoutPage } from './CheckoutPage'

vi.mock('@/api/checkoutApi', () => ({
  getCheckoutOptions: vi.fn(),
  createStorefrontOrder: vi.fn(),
}))

import { createStorefrontOrder, getCheckoutOptions } from '@/api/checkoutApi'

const mockedGetOptions = vi.mocked(getCheckoutOptions)
const mockedCreateOrder = vi.mocked(createStorefrontOrder)

const options: CheckoutOptions = {
  paymentMethods: [
    {
      code: 'BankTransfer',
      label: 'Transferencia bancaria',
      instructions: 'Banco Pichincha · Cuenta 1234567890',
    },
    { code: 'CashOnDelivery', label: 'Contra entrega', instructions: null },
  ],
  shippingMethods: [
    { code: 'Courier', label: 'Envío a domicilio', cost: 4.5 },
    { code: 'StorePickup', label: 'Retiro en tienda', cost: 0 },
  ],
}

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
    price: 6.5,
    quantity: 1,
    thumbUrl: null,
  },
]

const orderResult: StorefrontOrderResult = {
  orderId: 'o1',
  orderNumber: 'PED-0001',
  status: 'Pending',
  subtotal: 13.5,
  taxAmount: 0,
  shippingCost: 4.5,
  totalAmount: 18,
  paymentMethod: 'BankTransfer',
  paymentInstructions: 'Banco Pichincha · Cuenta 1234567890',
  paymentProofToken: '',
}

function renderPage() {
  const store = configureStore({
    reducer: {
      cart: cartReducer,
      ui: uiReducer,
      storefront: storefrontReducer,
    },
    preloadedState: {
      cart: { items, tenantId: 'tenant-1' },
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
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/" element={<p>Catálogo</p>} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/pedido/confirmado" element={<p>Pedido confirmado</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )

  return store
}

async function fillRequiredFields() {
  await userEvent.type(screen.getByLabelText(/Nombre completo/), 'Ana Pérez')
  await userEvent.type(screen.getByLabelText(/^Email/), 'ana@example.com')
  await userEvent.type(screen.getByLabelText(/^Teléfono/), '0991234567')
  await userEvent.type(screen.getByLabelText(/^Dirección/), 'Av. Siempre Viva 123')
  await userEvent.type(screen.getByLabelText(/^Ciudad/), 'Quito')
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    mockedGetOptions.mockResolvedValue(options)
    mockedCreateOrder.mockResolvedValue(orderResult)
  })

  afterEach(() => {
    delete window.turnstile
  })

  it('renderiza las opciones y calcula el total con el envío', async () => {
    renderPage()

    expect(
      await screen.findByRole('radio', { name: /Transferencia bancaria/ }),
    ).toBeChecked()
    expect(screen.getByRole('radio', { name: /Envío a domicilio/ })).toBeChecked()

    const summary = screen.getByRole('complementary', { name: 'Resumen del pedido' })
    expect(within(summary).getByText(formatPrice(4.5))).toBeInTheDocument()
    expect(within(summary).getByText(formatPrice(18))).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: /Retiro en tienda/ }))

    const totalRow = screen.getByText('Total').parentElement as HTMLElement
    expect(within(totalRow).getByText(formatPrice(13.5))).toBeInTheDocument()
  })

  it('valida los campos requeridos antes de enviar', async () => {
    renderPage()

    await screen.findByText('Transferencia bancaria')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    expect(await screen.findByText('Ingresa tu nombre.')).toBeInTheDocument()
    expect(screen.getByText('Ingresa tu email.')).toBeInTheDocument()
    expect(screen.getByText('Ingresa tu teléfono.')).toBeInTheDocument()
    expect(mockedCreateOrder).not.toHaveBeenCalled()
  })

  it('envía el pedido, limpia el carrito y navega a la confirmación', async () => {
    const store = renderPage()

    await screen.findByText('Transferencia bancaria')
    await fillRequiredFields()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    expect(await screen.findByText('Pedido confirmado')).toBeInTheDocument()
    expect(mockedCreateOrder).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        requestId: expect.any(String),
        paymentMethod: 'BankTransfer',
        shippingMethod: 'Courier',
        customer: {
          name: 'Ana Pérez',
          email: 'ana@example.com',
          phone: '0991234567',
          taxId: null,
        },
        shipping: {
          address: 'Av. Siempre Viva 123',
          city: 'Quito',
          reference: null,
        },
        items: [
          { catalogItemId: 'p1', quantity: 2 },
          { catalogItemId: 'p2', quantity: 1 },
        ],
        notes: null,
      }),
    )
    expect(store.getState().cart.items).toEqual([])
  })

  it('envía el turnstileToken cuando Turnstile está configurado', async () => {
    window.turnstile = {
      render: vi.fn((_container, renderOptions) => {
        const callback = renderOptions.callback as (token: string) => void
        callback('turnstile-test-token')
        return 'widget-1'
      }),
      remove: vi.fn(),
      reset: vi.fn(),
    }

    mockedGetOptions.mockResolvedValue({
      ...options,
      turnstileSiteKey: 'site-key-test',
    })

    renderPage()

    await screen.findByText('Transferencia bancaria')
    await fillRequiredFields()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    expect(await screen.findByText('Pedido confirmado')).toBeInTheDocument()
    expect(mockedCreateOrder).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ turnstileToken: 'turnstile-test-token' }),
    )
  })

  it('resetea el widget y muestra el error cuando falla el captcha', async () => {
    const reset = vi.fn()
    window.turnstile = {
      render: vi.fn(() => 'widget-2'),
      remove: vi.fn(),
      reset,
    }
    mockedGetOptions.mockResolvedValue({
      ...options,
      turnstileSiteKey: 'site-key-test',
    })
    mockedCreateOrder.mockRejectedValue({
      status: 400,
      code: 'ecommerce.checkout.captcha_failed',
      message: 'No pudimos verificar que eres humano. Intenta de nuevo.',
      detail: null,
    })

    renderPage()

    await screen.findByText('Transferencia bancaria')
    await fillRequiredFields()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    expect(
      await screen.findByText('No pudimos verificar que eres humano. Intenta de nuevo.'),
    ).toBeInTheDocument()
    expect(reset).toHaveBeenCalled()
  })

  it('mantiene el carrito y avisa cuando hay conflicto de stock', async () => {
    mockedCreateOrder.mockRejectedValue({
      status: 409,
      code: 'ecommerce.order.stock_conflict',
      message: 'El producto se agotó mientras comprabas.',
      detail: null,
    })
    const store = renderPage()

    await screen.findByText('Transferencia bancaria')
    await fillRequiredFields()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    expect(
      await screen.findByText('El producto se agotó mientras comprabas.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revisar carrito' })).toBeInTheDocument()
    expect(store.getState().cart.items).toHaveLength(2)
    expect(mockedGetOptions).toHaveBeenCalledTimes(2)
  })
})
