import { configureStore } from '@reduxjs/toolkit'
import { catalogReducer } from '@/store/catalogSlice'
import {
  cartReducer,
  hydrateCart,
  readStoredCart,
  writeStoredCart,
} from '@/store/cartSlice'
import { productReducer } from '@/store/productSlice'
import { storefrontReducer } from '@/store/storefrontSlice'
import { storefrontStatusReducer } from '@/store/storefrontStatusSlice'
import { uiReducer } from '@/store/uiSlice'

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    storefront: storefrontReducer,
    storefrontStatus: storefrontStatusReducer,
    catalog: catalogReducer,
    product: productReducer,
    cart: cartReducer,
  },
})

store.dispatch(hydrateCart(readStoredCart()))

let persistedItems = store.getState().cart.items
store.subscribe(() => {
  const items = store.getState().cart.items
  if (items === persistedItems) return
  persistedItems = items
  writeStoredCart(items)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
