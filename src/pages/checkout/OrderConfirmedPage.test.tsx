import { configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { StorefrontOrderResult } from '@/api/types'
import { formatPrice } from '@/lib/format'
import { storefrontReducer } from '@/store/storefrontSlice'
import { OrderConfirmedPage } from './OrderConfirmedPage'

vi.mock('@/api/checkoutApi', () => ({
  uploadPaymentProof: vi.fn(),
}))

import { uploadPaymentProof } from '@/api/checkoutApi'

const mockedUploadProof = vi.mocked(uploadPaymentProof)

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
  paymentProofToken: 'proof-token-1',
}

function renderPage(state?: StorefrontOrderResult) {
  const store = configureStore({
    reducer: { storefront: storefrontReducer },
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
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('muestra el pedido, los montos y las instrucciones de pago', () => {
    renderPage(order)

    expect(screen.getByText('PED-0001')).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText(formatPrice(19.5))).toBeInTheDocument()
    expect(screen.getByText(formatPrice(1.5))).toBeInTheDocument()
    expect(screen.getByText('Banco Pichincha · Cuenta 1234567890')).toBeInTheDocument()
    expect(screen.getByText('Te contactaremos para confirmar el pago.')).toBeInTheDocument()
  })

  it('sube el comprobante y muestra el éxito', async () => {
    mockedUploadProof.mockResolvedValue({
      uploadedAtUtc: '2026-09-27T00:00:00Z',
      fileName: 'comprobante.png',
      contentType: 'image/png',
    })

    renderPage(order)

    const file = new File(['comprobante'], 'comprobante.png', { type: 'image/png' })
    await userEvent.upload(screen.getByLabelText('Archivo del comprobante'), file)
    await userEvent.click(screen.getByRole('button', { name: 'Enviar comprobante' }))

    expect(
      await screen.findByText('Comprobante recibido: comprobante.png'),
    ).toBeInTheDocument()
    expect(mockedUploadProof).toHaveBeenCalledWith(
      'tenant-1',
      'o1',
      'proof-token-1',
      expect.any(File),
    )
  })

  it('muestra el error cuando la subida del comprobante falla', async () => {
    mockedUploadProof.mockRejectedValue({
      status: 400,
      code: 'ecommerce.checkout.proof_invalid_file',
      message: 'El comprobante debe ser una imagen JPG, PNG, WEBP o un PDF.',
      detail: null,
    })

    renderPage(order)

    const file = new File(['comprobante'], 'comprobante.png', { type: 'image/png' })
    await userEvent.upload(screen.getByLabelText('Archivo del comprobante'), file)
    await userEvent.click(screen.getByRole('button', { name: 'Enviar comprobante' }))

    expect(
      await screen.findByText('El comprobante debe ser una imagen JPG, PNG, WEBP o un PDF.'),
    ).toBeInTheDocument()
  })

  it('vuelve al catálogo cuando no hay pedido en el estado', () => {
    renderPage()

    expect(screen.getByText('Catálogo')).toBeInTheDocument()
  })
})
