import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { listStorefrontProducts } from '@/api/catalogApi'
import { normalizeApiError } from '@/api/errors'
import type { StorefrontProduct, StorefrontProductPage } from '@/api/types'
import type { RootState } from '@/app/store'
import { selectStorefrontTenantId } from './storefrontSlice'
import type { RequestStatus } from './requestStatus'

export type CatalogSort = 'name' | 'price_asc' | 'price_desc' | 'newest'

export interface CatalogQueryState {
  search: string
  sort: CatalogSort
  page: number
  pageSize: number
}

export const CATALOG_PAGE_SIZE = 24

export const initialCatalogQuery: CatalogQueryState = {
  search: '',
  sort: 'name',
  page: 1,
  pageSize: CATALOG_PAGE_SIZE,
}

export interface CatalogState {
  items: StorefrontProduct[]
  totalCount: number
  appliedQuery: CatalogQueryState
  productsStatus: RequestStatus
  productsError: string | null
  productsRequestId: string | null
}

const initialState: CatalogState = {
  items: [],
  totalCount: 0,
  appliedQuery: initialCatalogQuery,
  productsStatus: 'idle',
  productsError: null,
  productsRequestId: null,
}

export const fetchProducts = createAsyncThunk<
  { page: StorefrontProductPage; query: CatalogQueryState },
  CatalogQueryState,
  { rejectValue: string; state: RootState }
>('catalog/fetchProducts', async (query, { rejectWithValue, signal, getState }) => {
  const tenantId = selectStorefrontTenantId(getState())
  if (!tenantId) {
    return rejectWithValue('La tienda aún no está configurada para este dominio.')
  }

  try {
    const page = await listStorefrontProducts(tenantId, query, signal)
    return { page, query }
  } catch (error) {
    if (signal.aborted) throw error
    return rejectWithValue(normalizeApiError(error).message)
  }
})

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {
    resetCatalog(state) {
      state.items = []
      state.totalCount = 0
      state.appliedQuery = initialCatalogQuery
      state.productsStatus = 'idle'
      state.productsError = null
      state.productsRequestId = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state, action) => {
        state.productsStatus = 'loading'
        state.productsError = null
        state.productsRequestId = action.meta.requestId
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        if (state.productsRequestId !== action.meta.requestId) return
        state.productsStatus = 'succeeded'
        state.items = action.payload.page.items
        state.totalCount = action.payload.page.totalCount
        state.appliedQuery = action.payload.query
        state.productsRequestId = null
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        if (state.productsRequestId !== action.meta.requestId) return
        state.productsRequestId = null
        if (action.meta.aborted) return
        state.productsStatus = 'failed'
        state.productsError =
          action.payload ?? action.error.message ?? 'No se pudo cargar el catálogo.'
      })
  },
})

export const { resetCatalog } = catalogSlice.actions

export const catalogReducer = catalogSlice.reducer

export interface CatalogRootState {
  catalog: CatalogState
}

export const selectCatalogItems = (state: CatalogRootState) => state.catalog.items
export const selectCatalogTotalCount = (state: CatalogRootState) => state.catalog.totalCount
export const selectCatalogAppliedQuery = (state: CatalogRootState) => state.catalog.appliedQuery
export const selectProductsStatus = (state: CatalogRootState) => state.catalog.productsStatus
export const selectProductsError = (state: CatalogRootState) => state.catalog.productsError
