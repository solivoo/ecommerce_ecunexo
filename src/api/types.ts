export type CatalogItemKind = 'physical' | 'service'

export type CatalogSort =
  | 'relevance'
  | 'name'
  | 'price_asc'
  | 'price_desc'
  | 'newest'
  | 'likes'

export const STOREFRONT_FACET_KEYS = [
  'talla',
  'color',
  'actividad',
  'cana',
  'material',
  'marca',
  'coleccion',
] as const

export type StorefrontFacetKey = (typeof STOREFRONT_FACET_KEYS)[number]

export interface StorefrontConfig {
  tenantId: string
  name: string
  logoUrl: string | null
  primaryColorHex: string | null
  locale: string
  currency: string
}

export interface StorefrontStatus {
  revision: string
  updatedAt: string | null
  maintenanceEnabled?: boolean
  maintenanceMessage?: string | null
}

export interface CatalogQuery {
  search?: string
  sort?: CatalogSort
  page?: number
  pageSize?: number
  talla?: string[]
  color?: string[]
  actividad?: string[]
  cana?: string[]
  material?: string[]
  marca?: string[]
  coleccion?: string[]
  priceMin?: number
  priceMax?: number
  inStock?: boolean
  isNew?: boolean
}

export interface StorefrontFacetValue {
  value: string
  label: string
  count: number
}

export interface StorefrontFacetAttribute {
  key: string
  label: string
  values: StorefrontFacetValue[]
}

export interface StorefrontFacets {
  attributes: StorefrontFacetAttribute[]
  priceMin: number | null
  priceMax: number | null
  inStockCount: number
  newCount: number
}

export interface StorefrontProduct {
  id: string
  kind: CatalogItemKind
  name: string
  description: string | null
  price: number | null
  originalPrice?: number | null
  discountPercent?: number | null
  thumbUrl: string | null
  mediumUrl: string | null
  secondMediumUrl: string | null
  colors: string[]
  inStock: boolean
  hasVariants: boolean
  variantCount: number
  isNew: boolean
  likeCount: number
  createdAt: string
}

export interface StorefrontProductPage {
  items: StorefrontProduct[]
  totalCount: number
  page: number
  pageSize: number
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
  originalPrice?: number | null
  discountPercent?: number | null
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
  originalPrice?: number | null
  discountPercent?: number | null
  inStock: boolean
  availableQuantity: number
  images: StorefrontImage[]
  variants: StorefrontVariant[]
  matrix: StorefrontMatrix | null
  attributes: StorefrontAttribute[]
  likeCount: number
  createdAt: string
  updatedAt: string | null
}

export interface RawStorefrontProduct extends Omit<StorefrontProduct, 'kind'> {
  kind: number | string
}

export interface RawStorefrontProductDetail extends Omit<StorefrontProductDetail, 'kind'> {
  kind: number | string
}

export interface CheckoutPaymentMethod {
  code: string
  label: string
  instructions: string | null
}

export interface CheckoutShippingMethod {
  code: string
  label: string
  cost: number
}

export interface CheckoutOptions {
  paymentMethods: CheckoutPaymentMethod[]
  shippingMethods: CheckoutShippingMethod[]
  whatsappPhone?: string | null
  /** Site key de Cloudflare Turnstile; null/ausente cuando el captcha está deshabilitado. */
  turnstileSiteKey?: string | null
}

export interface CreateStorefrontOrderCustomerInput {
  name: string
  email: string
  phone: string
  taxId: string | null
}

export interface CreateStorefrontOrderShippingInput {
  address: string
  city: string
  reference: string | null
}

export interface CreateStorefrontOrderItemInput {
  catalogItemId: string
  quantity: number
}

export interface CreateStorefrontOrderInput {
  requestId: string
  customer: CreateStorefrontOrderCustomerInput
  shipping: CreateStorefrontOrderShippingInput
  paymentMethod: string
  shippingMethod: string
  items: CreateStorefrontOrderItemInput[]
  notes: string | null
  /** Campo trampa anti-bot: debe ir vacío. */
  contactFax?: string | null
  /** Milisegundos desde que se abrió el formulario (fricción mínima anti-bot). */
  formElapsedMs?: number | null
  /** Token de Cloudflare Turnstile cuando el captcha está habilitado. */
  turnstileToken?: string | null
  /** El comprador aceptó la política de tratamiento de datos personales. */
  acceptPrivacyPolicy: boolean
}

export interface StorefrontOrderResult {
  orderId: string
  orderNumber: string
  status: string
  subtotal: number
  taxAmount: number
  shippingCost: number
  totalAmount: number
  paymentMethod: string
  paymentInstructions: string | null
  /** Token secreto para autorizar la subida del comprobante de pago. */
  paymentProofToken: string
}

export interface PaymentProofUploadResult {
  uploadedAtUtc: string
  fileName: string
  contentType: string
}

export interface ProductLikeResult {
  liked: boolean
  likeCount: number
}
