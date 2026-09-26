import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { getStorefrontProduct } from '@/api/catalogApi'
import { normalizeApiError } from '@/api/errors'
import type { StorefrontProductDetail } from '@/api/types'
import type { RootState } from '@/app/store'
import { selectStorefrontTenantId } from './storefrontSlice'
import type { RequestStatus } from './requestStatus'

export interface ProductState {
  product: StorefrontProductDetail | null
  status: RequestStatus
  error: string | null
  requestId: string | null
}

const initialState: ProductState = {
  product: null,
  status: 'idle',
  error: null,
  requestId: null,
}

export const fetchProduct = createAsyncThunk<
  StorefrontProductDetail,
  string,
  { rejectValue: string; state: RootState }
>('product/fetchProduct', async (productId, { rejectWithValue, signal, getState }) => {
  const tenantId = selectStorefrontTenantId(getState())
  if (!tenantId) {
    return rejectWithValue('La tienda aún no está configurada para este dominio.')
  }

  try {
    return await getStorefrontProduct(tenantId, productId, signal)
  } catch (error) {
    if (signal.aborted) throw error
    return rejectWithValue(normalizeApiError(error).message)
  }
})

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    clearProduct(state) {
      state.product = null
      state.status = 'idle'
      state.error = null
      state.requestId = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProduct.pending, (state, action) => {
        state.status = 'loading'
        state.error = null
        state.requestId = action.meta.requestId
      })
      .addCase(fetchProduct.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.status = 'succeeded'
        state.product = action.payload
        state.requestId = null
      })
      .addCase(fetchProduct.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.requestId = null
        if (action.meta.aborted) return
        state.status = 'failed'
        state.error = action.payload ?? action.error.message ?? 'No se pudo cargar el producto.'
      })
  },
})

export const { clearProduct } = productSlice.actions

export const productReducer = productSlice.reducer

export interface ProductRootState {
  product: ProductState
}

export const selectProduct = (state: ProductRootState) => state.product.product
export const selectProductStatus = (state: ProductRootState) => state.product.status
export const selectProductError = (state: ProductRootState) => state.product.error
