import { api } from './client'
import type {
  CatalogItemKind,
  CatalogQuery,
  RawStorefrontProduct,
  RawStorefrontProductDetail,
  StorefrontCategory,
  StorefrontProduct,
  StorefrontProductDetail,
  StorefrontProductPage,
} from './types'

function storefrontUrl(tenantId: string, path: string): string {
  return `/api/v1/public/tenants/${tenantId}/storefront${path}`
}

function mapKind(kind: number | string): CatalogItemKind {
  return kind === 1 || kind === 'service' ? 'service' : 'physical'
}

function mapProduct(raw: RawStorefrontProduct): StorefrontProduct {
  return { ...raw, kind: mapKind(raw.kind) }
}

export async function listStorefrontProducts(
  tenantId: string,
  query: CatalogQuery,
  signal?: AbortSignal,
): Promise<StorefrontProductPage> {
  const response = await api.get<StorefrontProductPage>(
    storefrontUrl(tenantId, '/products'),
    {
      params: {
        search: query.search?.trim() || undefined,
        categoryId: query.categoryId ?? undefined,
        sort: query.sort,
        page: query.page,
        pageSize: query.pageSize,
      },
      signal,
    },
  )

  const data = response.data
  return { ...data, items: (data.items as RawStorefrontProduct[]).map(mapProduct) }
}

export async function getStorefrontProduct(
  tenantId: string,
  productId: string,
  signal?: AbortSignal,
): Promise<StorefrontProductDetail> {
  const response = await api.get<RawStorefrontProductDetail>(
    storefrontUrl(tenantId, `/products/${productId}`),
    { signal },
  )

  return { ...response.data, kind: mapKind(response.data.kind) }
}

export async function listStorefrontCategories(
  tenantId: string,
  signal?: AbortSignal,
): Promise<StorefrontCategory[]> {
  const response = await api.get<StorefrontCategory[]>(
    storefrontUrl(tenantId, '/categories'),
    { signal },
  )

  return response.data
}
