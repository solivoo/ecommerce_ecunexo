import { api } from './client'
import type {
  CalculateStorefrontQuoteInput,
  CheckoutOptions,
  CreateStorefrontOrderInput,
  EcuadorCanton,
  EcuadorProvince,
  PaymentProofUploadResult,
  StorefrontCheckoutQuote,
  StorefrontOrderResult,
  StorefrontShippingOption,
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
    taxRate: data.taxRate ?? 0.15,
    pricesIncludeTax: data.pricesIncludeTax ?? true,
    dynamicShippingEnabled: data.dynamicShippingEnabled ?? false,
  }
}

export async function listEcuadorProvinces(
  signal?: AbortSignal,
): Promise<EcuadorProvince[]> {
  const response = await api.get<EcuadorProvince[]>(
    '/api/v1/public/storefront/ecuador/provinces',
    { signal },
  )
  return response.data
}

export async function listEcuadorCantons(
  provinceId: string,
  signal?: AbortSignal,
): Promise<EcuadorCanton[]> {
  const response = await api.get<EcuadorCanton[]>(
    `/api/v1/public/storefront/ecuador/provinces/${provinceId}/cantons`,
    { signal },
  )
  return response.data
}

export async function listStorefrontShippingOptions(
  tenantId: string,
  cantonId: string,
  subtotal: number,
  signal?: AbortSignal,
): Promise<StorefrontShippingOption[]> {
  const response = await api.get<StorefrontShippingOption[]>(
    storefrontUrl(tenantId, '/shipping-options'),
    {
      params: { cantonId, subtotal },
      signal,
    },
  )
  return response.data
}

export async function calculateStorefrontQuote(
  tenantId: string,
  input: CalculateStorefrontQuoteInput,
  signal?: AbortSignal,
): Promise<StorefrontCheckoutQuote> {
  const response = await api.post<StorefrontCheckoutQuote>(
    storefrontUrl(tenantId, '/checkout-quote'),
    input,
    { signal },
  )
  return response.data
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
