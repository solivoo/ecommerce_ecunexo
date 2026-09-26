import { api } from './client'
import type {
  CheckoutOptions,
  CreateStorefrontOrderInput,
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
