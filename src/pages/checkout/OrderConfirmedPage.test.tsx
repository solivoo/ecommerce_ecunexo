import { configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { StorefrontOrderResult } from '@/api/types'
import { formatPrice } from '@/lib/format'
import { storefrontReducer } from '@/store/storefrontSlice'
import { OrderConfirmedPage } from './OrderConfirmedPage'

const order: StorefrontOrderResult = {
  orderId: 'o1',
  orderNumber: 'PED-0001',
  status: 'Pending',
  subtotal: 13.5,
  taxAmount: 1.5,
  shippingCost: 4.5,
  totalAmount: 19.5,
  paymentMethod: 'BankTransfer',
  paymentInstructions: 'Banco Pichincha · Cuenta 1234567890',
}

function renderPage(state?: StorefrontOrderResult) {
  const store = configureStore({ reducer: { storefront: storefrontReducer } })

  render(
    <Provider store={store}>
      <MemoryRouter
        initialEntries={[
          state ? { pathname: '/pedido/confirmado', state } : '/pedido/confirmado',
        ]}
      >
        <Routes>
          <Route path="/" element={<p>Catálogo</p>} />
          <Route path="/pedido/confirmado" element={<OrderConfirmedPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

describe('OrderConfirmedPage', () => {
  it('muestra el pedido, los montos y las instrucciones de pago', () => {
    renderPage(order)

    expect(screen.getByText('PED-0001')).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText(formatPrice(19.5))).toBeInTheDocument()
    expect(screen.getByText(formatPrice(1.5))).toBeInTheDocument()
    expect(screen.getByText('Banco Pichincha · Cuenta 1234567890')).toBeInTheDocument()
    expect(screen.getByText('Te contactaremos para confirmar el pago.')).toBeInTheDocument()
  })

  it('vuelve al catálogo cuando no hay pedido en el estado', () => {
    renderPage()

    expect(screen.getByText('Catálogo')).toBeInTheDocument()
  })
})
