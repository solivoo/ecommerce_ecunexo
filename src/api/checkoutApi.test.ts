import type { AxiosResponse } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import {
  createStorefrontOrder,
  getCheckoutOptions,
  uploadPaymentProof,
} from './checkoutApi'
import { api } from './client'
import type { CreateStorefrontOrderInput, StorefrontOrderResult } from './types'

vi.mock('./client', () => ({ api: { get: vi.fn(), post: vi.fn() } }))

const mockedGet = vi.mocked(api.get)
const mockedPost = vi.mocked(api.post)

describe('checkoutApi', () => {
  it('carga las opciones de checkout y normaliza las instrucciones', async () => {
    mockedGet.mockResolvedValue({
      data: {
        paymentMethods: [{ code: 'BankTransfer', label: 'Transferencia bancaria' }],
        shippingMethods: [{ code: 'Courier', label: 'Envío a domicilio', cost: 4.5 }],
        turnstileSiteKey: 'site-key-1',
      },
    } as AxiosResponse)

    const options = await getCheckoutOptions('tenant-1')

    expect(mockedGet.mock.calls[0][0]).toBe(
      '/api/v1/public/tenants/tenant-1/storefront/checkout-options',
    )
    expect(options.paymentMethods[0].instructions).toBeNull()
    expect(options.turnstileSiteKey).toBe('site-key-1')
  })

  it('crea el pedido contra el endpoint público de órdenes', async () => {
    const input: CreateStorefrontOrderInput = {
      requestId: 'request-1',
      customer: {
        name: 'Ana Pérez',
        email: 'ana@example.com',
        phone: '0991234567',
        taxId: null,
      },
      shipping: { address: 'Av. Siempre Viva 123', city: 'Quito', reference: null },
      paymentMethod: 'BankTransfer',
      shippingMethod: 'Courier',
      items: [{ catalogItemId: 'p1', quantity: 2 }],
      notes: null,
    }

    const result: StorefrontOrderResult = {
      orderId: 'o1',
      orderNumber: 'PED-0001',
      status: 'Pending',
      subtotal: 7,
      taxAmount: 0,
      shippingCost: 4.5,
      totalAmount: 11.5,
      paymentMethod: 'BankTransfer',
      paymentInstructions: null,
      paymentProofToken: 'proof-token-1',
    }

    mockedPost.mockResolvedValue({ data: result } as AxiosResponse)

    await expect(createStorefrontOrder('tenant-1', input)).resolves.toEqual(result)
    expect(mockedPost).toHaveBeenCalledWith(
      '/api/v1/public/tenants/tenant-1/storefront/orders',
      input,
    )
  })

  it('sube el comprobante como multipart con el header del token', async () => {
    const uploadResult = {
      uploadedAtUtc: '2026-09-27T00:00:00Z',
      fileName: 'comprobante.png',
      contentType: 'image/png',
    }
    mockedPost.mockResolvedValue({ data: uploadResult } as AxiosResponse)

    const file = new File(['comprobante'], 'comprobante.png', { type: 'image/png' })
    const result = await uploadPaymentProof('tenant-1', 'o1', 'proof-token-1', file)

    expect(result).toEqual(uploadResult)
    expect(mockedPost).toHaveBeenCalledWith(
      '/api/v1/public/tenants/tenant-1/storefront/orders/o1/payment-proof',
      expect.any(FormData),
      { headers: { 'X-Payment-Proof-Token': 'proof-token-1' } },
    )
  })
})
