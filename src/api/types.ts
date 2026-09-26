export type CatalogItemKind = 'physical' | 'service'

export type CatalogSort = 'name' | 'price_asc' | 'price_desc' | 'newest'

export interface StorefrontConfig {
  tenantId: string
  name: string
  logoUrl: string | null
  primaryColorHex: string | null
  locale: string
  currency: string
}

export interface CatalogQuery {
  search?: string
  categoryId?: string | null
  sort?: CatalogSort
  page?: number
  pageSize?: number
}

export interface StorefrontProduct {
  id: string
  kind: CatalogItemKind
  name: string
  description: string | null
  price: number | null
  categoryId: string | null
  categoryName: string | null
  thumbUrl: string | null
  mediumUrl: string | null
  inStock: boolean
  hasVariants: boolean
  variantCount: number
  createdAt: string
}

export interface StorefrontProductPage {
  items: StorefrontProduct[]
  totalCount: number
  page: number
  pageSize: number
}

export interface StorefrontCategory {
  id: string
  name: string
  description: string | null
  parentId: string | null
}

export interface StorefrontImage {
  id: string
  altText: string | null
  isMain: boolean
  thumbUrl: string
  mediumUrl: string
  largeUrl: string
}

export interface StorefrontVariant {
  id: string
  name: string
  sku: string | null
  price: number | null
  inStock: boolean
  availableQuantity: number
  dimensions: Record<string, string> | null
  mainImageThumbUrl: string | null
  mainImageMediumUrl: string | null
  imageInherited: boolean
  imageInheritedFrom: string | null
  images: StorefrontImage[] | null
  extraColors: string[] | null
}

export interface StorefrontMatrixAxis {
  name: string
  type: string
  values: string[]
  isPhotoGroup: boolean
}

export interface StorefrontMatrix {
  depth: number
  primaryAxis: string | null
  axes: StorefrontMatrixAxis[]
  groupValues: string[]
}

export interface StorefrontAttribute {
  level: string
  name: string
  value: string
}

export interface StorefrontProductDetail {
  id: string
  kind: CatalogItemKind
  name: string
  sku: string | null
  description: string | null
  price: number | null
  categoryId: string | null
  categoryName: string | null
  inStock: boolean
  availableQuantity: number
  images: StorefrontImage[]
  variants: StorefrontVariant[]
  matrix: StorefrontMatrix | null
  attributes: StorefrontAttribute[]
  createdAt: string
  updatedAt: string | null
}

export interface RawStorefrontProduct extends Omit<StorefrontProduct, 'kind'> {
  kind: number | string
}

export interface RawStorefrontProductDetail extends Omit<StorefrontProductDetail, 'kind'> {
  kind: number | string
}
