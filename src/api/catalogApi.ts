import { api } from './client'
import { STOREFRONT_FACET_KEYS } from './types'
import type {
  CatalogItemKind,
  CatalogQuery,
  ProductLikeResult,
  RawStorefrontProduct,
  RawStorefrontProductDetail,
  StorefrontFacets,
  StorefrontProduct,
  StorefrontProductDetail,
  StorefrontProductPage,
  StorefrontStatus,
} from './types'

function storefrontUrl(tenantId: string, path: string): string {
  return `/api/v1/public/tenants/${tenantId}/storefront${path}`
}

export async function getStorefrontStatus(
  tenantId: string,
  signal?: AbortSignal,
): Promise<StorefrontStatus> {
  const { data } = await api.get<StorefrontStatus>(storefrontUrl(tenantId, '/status'), { signal })
  return data
}

function mapKind(kind: number | string): CatalogItemKind {
  return kind === 1 || kind === 'service' ? 'service' : 'physical'
}

function mapProduct(raw: RawStorefrontProduct): StorefrontProduct {
  return { ...raw, kind: mapKind(raw.kind) }
}

function buildProductParams(query: CatalogQuery): URLSearchParams {
  const params = new URLSearchParams()

  const search = query.search?.trim()
  if (search) params.set('search', search)
  if (query.sort) params.set('sort', query.sort)
  if (query.page) params.set('page', String(query.page))
  if (query.pageSize) params.set('pageSize', String(query.pageSize))

  for (const key of STOREFRONT_FACET_KEYS) {
    for (const value of query[key] ?? []) {
      const trimmed = value.trim()
      if (trimmed) params.append(key, trimmed)
    }
  }

  if (query.priceMin !== undefined) params.set('priceMin', String(query.priceMin))
  if (query.priceMax !== undefined) params.set('priceMax', String(query.priceMax))
  if (query.inStock) params.set('inStock', 'true')
  if (query.isNew) params.set('new', 'true')

  return params
}

export async function listStorefrontProducts(
  tenantId: string,
  query: CatalogQuery,
  signal?: AbortSignal,
): Promise<StorefrontProductPage> {
  const response = await api.get<StorefrontProductPage>(
    storefrontUrl(tenantId, '/products'),
    { params: buildProductParams(query), signal },
  )

  const data = response.data
  return { ...data, items: (data.items as RawStorefrontProduct[]).map(mapProduct) }
}

export async function listStorefrontFacets(
  tenantId: string,
  signal?: AbortSignal,
): Promise<StorefrontFacets> {
  const response = await api.get<StorefrontFacets>(storefrontUrl(tenantId, '/facets'), {
    signal,
  })
  return response.data
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

export async function likeProduct(
  tenantId: string,
  productId: string,
  visitorId: string,
): Promise<ProductLikeResult> {
  const response = await api.post<ProductLikeResult>(
    storefrontUrl(tenantId, `/products/${productId}/like`),
    { visitorId },
  )
  return response.data
}

export async function unlikeProduct(
  tenantId: string,
  productId: string,
  visitorId: string,
): Promise<ProductLikeResult> {
  const response = await api.delete<ProductLikeResult>(
    storefrontUrl(tenantId, `/products/${productId}/like`),
    { params: { visitorId } },
  )
  return response.data
}
