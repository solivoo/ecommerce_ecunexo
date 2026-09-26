import { api } from './client'
import type { StorefrontConfig } from './types'

export async function resolveStorefront(
  host: string,
  signal?: AbortSignal,
): Promise<StorefrontConfig> {
  const response = await api.get<StorefrontConfig>('/api/v1/public/storefront/resolve', {
    params: { host },
    signal,
  })

  return response.data
}
