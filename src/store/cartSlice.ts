import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { roundCurrency } from '@/lib/format'
import { bootstrapStorefront } from './storefrontSlice'

export const CART_STORAGE_KEY = 'ecunexo.cart.v1'
export const CART_MAX_QUANTITY = 10

export interface CartItem {
  catalogItemId: string
  name: string
  sku: string | null
  price: number
  originalPrice?: number | null
  discountPercent?: number | null
  quantity: number
  thumbUrl: string | null
  /** Cantidad mínima de compra del producto/variante (1 por defecto). */
  minOrderQuantity?: number
  /** Stock disponible real. `null` = sin límite por stock. `undefined` = aún no consultado. */
  availableQuantity?: number | null
}

export interface CartState {
  items: CartItem[]
  tenantId: string | null
}

const initialState: CartState = {
  items: [],
  tenantId: null,
}

function clampQuantity(quantity: number, max = CART_MAX_QUANTITY): number {
  if (!Number.isFinite(quantity)) return 1
  return Math.min(max, Math.max(1, Math.trunc(quantity)))
}

function sanitizeItem(value: unknown): CartItem | null {
  if (typeof value !== 'object' || value === null) return null

  const candidate = value as Partial<CartItem>
  const { catalogItemId, name, price, sku, quantity, thumbUrl } = candidate

  if (typeof catalogItemId !== 'string' || !catalogItemId.trim()) return null
  if (typeof name !== 'string' || !name.trim()) return null
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) return null

  const roundedPrice = roundCurrency(price)
  const originalPrice =
    typeof candidate.originalPrice === 'number' &&
    Number.isFinite(candidate.originalPrice) &&
    candidate.originalPrice > roundedPrice
      ? roundCurrency(candidate.originalPrice)
      : null
  const discountPercent =
    originalPrice === null
      ? null
      : typeof candidate.discountPercent === 'number' &&
          Number.isFinite(candidate.discountPercent) &&
          candidate.discountPercent > 0
        ? Math.round(candidate.discountPercent)
        : Math.round((1 - roundedPrice / originalPrice) * 100)

  const minOrderQuantity =
    typeof candidate.minOrderQuantity === 'number' &&
    Number.isFinite(candidate.minOrderQuantity) &&
    candidate.minOrderQuantity >= 1
      ? Math.trunc(candidate.minOrderQuantity)
      : 1

  return {
    catalogItemId,
    name,
    sku: typeof sku === 'string' && sku.trim() ? sku : null,
    price: roundedPrice,
    originalPrice,
    discountPercent: discountPercent !== null && discountPercent > 0 ? discountPercent : null,
    quantity: clampQuantity(typeof quantity === 'number' ? quantity : 1),
    thumbUrl: typeof thumbUrl === 'string' && thumbUrl.trim() ? thumbUrl : null,
    minOrderQuantity,
    availableQuantity:
      candidate.availableQuantity === null
        ? null
        : typeof candidate.availableQuantity === 'number' &&
            Number.isFinite(candidate.availableQuantity) &&
            candidate.availableQuantity >= 0
          ? Math.trunc(candidate.availableQuantity)
          : undefined,
  }
}

export function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return []

  try {
    const data = JSON.parse(raw) as unknown
    const items = Array.isArray(data)
      ? data
      : (data as { items?: unknown } | null)?.items

    if (!Array.isArray(items)) return []

    return items
      .map(sanitizeItem)
      .filter((item): item is CartItem => item !== null)
  } catch {
    return []
  }
}

export function readStoredCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  return parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY))
}

export function writeStoredCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: 1, items }))
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    hydrateCart(state, action: PayloadAction<CartItem[]>) {
      state.items = action.payload
        .map(sanitizeItem)
        .filter((item): item is CartItem => item !== null)
    },
    addItem(state, action: PayloadAction<CartItem>) {
      const item = sanitizeItem(action.payload)
      if (!item) return

      const existing = state.items.find(
        (candidate) => candidate.catalogItemId === item.catalogItemId,
      )

      if (existing) {
        existing.quantity = clampQuantity(existing.quantity + item.quantity)
        existing.availableQuantity = item.availableQuantity
      } else {
        state.items.push(item)
      }
    },
    /** Deja la cantidad exacta del producto en el carrito (no suma). Usado desde la ficha. */
    upsertItem(state, action: PayloadAction<CartItem>) {
      const item = sanitizeItem(action.payload)
      if (!item) return

      const existing = state.items.find(
        (candidate) => candidate.catalogItemId === item.catalogItemId,
      )

      if (existing) {
        existing.quantity = item.quantity
        existing.availableQuantity = item.availableQuantity
      } else {
        state.items.push(item)
      }
    },
    setQuantity(
      state,
      action: PayloadAction<{ catalogItemId: string; quantity: number }>,
    ) {
      const item = state.items.find(
        (candidate) => candidate.catalogItemId === action.payload.catalogItemId,
      )
      if (!item) return
      const max = item.availableQuantity ?? CART_MAX_QUANTITY
      item.quantity = clampQuantity(action.payload.quantity, max)
    },
    /**
     * Recorta las cantidades guardadas al stock real que reporta la cotización.
     * `availableQuantity === null` significa que el producto no tiene límite por stock.
     */
    applyAvailability(
      state,
      action: PayloadAction<Array<{ catalogItemId: string; availableQuantity: number | null }>>,
    ) {
      for (const line of action.payload) {
        const item = state.items.find(
          (candidate) => candidate.catalogItemId === line.catalogItemId,
        )
        if (!item) continue
        item.availableQuantity = line.availableQuantity
        if (line.availableQuantity !== null && item.quantity > line.availableQuantity) {
          item.quantity = Math.max(1, Math.trunc(line.availableQuantity))
        }
      }
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter(
        (item) => item.catalogItemId !== action.payload,
      )
    },
    clearCart(state) {
      state.items = []
    },
  },
  extraReducers: (builder) => {
    builder.addCase(bootstrapStorefront.fulfilled, (state, action) => {
      const tenantId = action.payload.tenantId
      if (state.tenantId !== null && state.tenantId !== tenantId) {
        state.items = []
      }
      state.tenantId = tenantId
    })
  },
})

export const { hydrateCart, addItem, upsertItem, setQuantity, applyAvailability, removeItem, clearCart } =
  cartSlice.actions

export const cartReducer = cartSlice.reducer

export interface CartRootState {
  cart?: CartState
}

export function selectCartItems(state: CartRootState): CartItem[] {
  return state.cart?.items ?? []
}

export function selectCartCount(state: CartRootState): number {
  return selectCartItems(state).reduce((total, item) => total + item.quantity, 0)
}

export function selectCartSubtotal(state: CartRootState): number {
  return roundCurrency(
    selectCartItems(state).reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    ),
  )
}

/** Ítems cuya cantidad está por debajo de su compra mínima. */
export function selectCartItemsBelowMinQuantity(state: CartRootState): CartItem[] {
  return selectCartItems(state).filter(
    (item) => item.quantity < (item.minOrderQuantity ?? 1),
  )
}
