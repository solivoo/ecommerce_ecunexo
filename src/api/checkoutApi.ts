import { api } from './client'
import type {
  CheckoutOptions,
  CreateStorefrontOrderInput,
  PaymentProofUploadResult,
  StorefrontOrderResult,
} from './types'

function storefrontUrl(tenantId: string, path: string): string {
  return `/api/v1/public/tenants/${tenantId}/storefront${path}`
}

export async function getCheckoutOptions(
  tenantId: string,
  signal?: AbortSignal,
): Promise<CheckoutOptions> {
  const response = await api.get<CheckoutOptions>(
    storefrontUrl(tenantId, '/checkout-options'),
    { signal },
  )

  const data = response.data
  return {
    paymentMethods: data.paymentMethods.map((method) => ({
      ...method,
      instructions: method.instructions ?? null,
    })),
    shippingMethods: data.shippingMethods,
    whatsappPhone: data.whatsappPhone ?? null,
    turnstileSiteKey: data.turnstileSiteKey ?? null,
    minOrderAmount: data.minOrderAmount ?? null,
  }
}

export async function createStorefrontOrder(
  tenantId: string,
  input: CreateStorefrontOrderInput,
): Promise<StorefrontOrderResult> {
  const response = await api.post<StorefrontOrderResult>(
    storefrontUrl(tenantId, '/orders'),
    input,
  )
  return response.data
}

export async function uploadPaymentProof(
  tenantId: string,
  orderId: string,
  token: string,
  file: File,
): Promise<PaymentProofUploadResult> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post<PaymentProofUploadResult>(
    storefrontUrl(tenantId, `/orders/${orderId}/payment-proof`),
    formData,
    { headers: { 'X-Payment-Proof-Token': token } },
  )
  return response.data
}
