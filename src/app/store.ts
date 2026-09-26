import { configureStore } from '@reduxjs/toolkit'
import { catalogReducer } from '@/store/catalogSlice'
import { productReducer } from '@/store/productSlice'
import { storefrontReducer } from '@/store/storefrontSlice'
import { uiReducer } from '@/store/uiSlice'

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    storefront: storefrontReducer,
    catalog: catalogReducer,
    product: productReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
