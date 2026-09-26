import { describe, expect, it } from 'vitest'
import {
  addItem,
  CART_MAX_QUANTITY,
  CART_STORAGE_KEY,
  cartReducer,
  clearCart,
  hydrateCart,
  parseStoredCart,
  readStoredCart,
  removeItem,
  selectCartCount,
  selectCartSubtotal,
  setQuantity,
  writeStoredCart,
  type CartItem,
} from './cartSlice'
import { bootstrapStorefront } from './storefrontSlice'

function buildItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    catalogItemId: 'item-1',
    name: 'Calcetín Runner',
    sku: 'CALC-NEG',
    price: 3.5,
    quantity: 1,
    thumbUrl: 'https://cdn/thumb.webp',
    ...overrides,
  }
}

describe('cartSlice', () => {
  it('fusiona ítems por catalogItemId', () => {
    let state = cartReducer(undefined, addItem(buildItem({ quantity: 2 })))
    state = cartReducer(state, addItem(buildItem({ quantity: 3, name: 'Otro nombre' })))

    expect(state.items).toHaveLength(1)
    expect(state.items[0].quantity).toBe(5)
    expect(state.items[0].name).toBe('Calcetín Runner')
  })

  it('respeta el tope de cantidad al agregar', () => {
    let state = cartReducer(undefined, addItem(buildItem({ quantity: 8 })))
    state = cartReducer(state, addItem(buildItem({ quantity: 5 })))

    expect(state.items[0].quantity).toBe(CART_MAX_QUANTITY)
  })

  it('ajusta la cantidad entre 1 y 10', () => {
    let state = cartReducer(undefined, addItem(buildItem({ quantity: 4 })))

    state = cartReducer(
      state,
      setQuantity({ catalogItemId: 'item-1', quantity: 0 }),
    )
    expect(state.items[0].quantity).toBe(1)

    state = cartReducer(
      state,
      setQuantity({ catalogItemId: 'item-1', quantity: 99 }),
    )
    expect(state.items[0].quantity).toBe(CART_MAX_QUANTITY)

    state = cartReducer(
      state,
      setQuantity({ catalogItemId: 'desconocido', quantity: 5 }),
    )
    expect(state.items).toHaveLength(1)
  })

  it('elimina ítems y limpia el carrito', () => {
    let state = cartReducer(undefined, addItem(buildItem()))
    state = cartReducer(state, addItem(buildItem({ catalogItemId: 'item-2' })))

    state = cartReducer(state, removeItem('item-1'))
    expect(state.items.map((item) => item.catalogItemId)).toEqual(['item-2'])

    state = cartReducer(state, clearCart())
    expect(state.items).toEqual([])
  })

  it('hidrata descartando valores inválidos y acotando cantidades', () => {
    const state = cartReducer(
      undefined,
      hydrateCart([
        buildItem({ quantity: 15 }),
        buildItem({ catalogItemId: 'item-2', quantity: -3 }),
        buildItem({ catalogItemId: '', name: '' }),
      ] as CartItem[]),
    )

    expect(state.items).toHaveLength(2)
    expect(state.items[0].quantity).toBe(CART_MAX_QUANTITY)
    expect(state.items[1].quantity).toBe(1)
  })

  it('parsea el carrito persistido y tolera datos corruptos', () => {
    expect(parseStoredCart(null)).toEqual([])
    expect(parseStoredCart('no-json')).toEqual([])
    expect(parseStoredCart(JSON.stringify({ items: 'nope' }))).toEqual([])

    const parsed = parseStoredCart(
      JSON.stringify({ version: 1, items: [buildItem({ quantity: 2 })] }),
    )
    expect(parsed).toHaveLength(1)
    expect(parsed[0].quantity).toBe(2)
  })

  it('escribe y lee el carrito desde localStorage', () => {
    writeStoredCart([buildItem({ quantity: 3 })])
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toContain('"quantity":3')

    expect(readStoredCart()).toHaveLength(1)
    expect(readStoredCart()[0].quantity).toBe(3)
  })

  it('calcula contador y subtotal', () => {
    let state = cartReducer(undefined, addItem(buildItem({ quantity: 2 })))
    state = cartReducer(
      state,
      addItem(buildItem({ catalogItemId: 'item-2', price: 1.25, quantity: 4 })),
    )

    expect(selectCartCount({ cart: state })).toBe(6)
    expect(selectCartSubtotal({ cart: state })).toBe(12)
  })

  it('limpia el carrito cuando cambia el tenant', () => {
    const state = cartReducer(undefined, addItem(buildItem()))
    const action = bootstrapStorefront.fulfilled(
      {
        tenantId: 'tenant-b',
        name: 'Tienda B',
        logoUrl: null,
        primaryColorHex: null,
        locale: 'es-EC',
        currency: 'USD',
      },
      'request-1',
      undefined,
    )

    const withTenant = cartReducer({ ...state, tenantId: 'tenant-a' }, action)
    expect(withTenant.items).toEqual([])
    expect(withTenant.tenantId).toBe('tenant-b')

    const sameTenant = cartReducer({ ...state, tenantId: 'tenant-b' }, action)
    expect(sameTenant.items).toHaveLength(1)
  })
})
