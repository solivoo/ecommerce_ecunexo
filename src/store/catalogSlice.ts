import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { listStorefrontCategories, listStorefrontProducts } from '@/api/catalogApi'
import { normalizeApiError } from '@/api/errors'
import type {
  StorefrontCategory,
  StorefrontProduct,
  StorefrontProductPage,
} from '@/api/types'
import type { RootState } from '@/app/store'
import { selectStorefrontTenantId } from './storefrontSlice'
import type { RequestStatus } from './requestStatus'

export type CatalogSort = 'name' | 'price_asc' | 'price_desc' | 'newest'

export interface CatalogQueryState {
  search: string
  categoryId: string | null
  sort: CatalogSort
  page: number
  pageSize: number
}

export const CATALOG_PAGE_SIZE = 24

export const initialCatalogQuery: CatalogQueryState = {
  search: '',
  categoryId: null,
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
  categories: StorefrontCategory[]
  categoriesStatus: RequestStatus
  categoriesError: string | null
}

const initialState: CatalogState = {
  items: [],
  totalCount: 0,
  appliedQuery: initialCatalogQuery,
  productsStatus: 'idle',
  productsError: null,
  productsRequestId: null,
  categories: [],
  categoriesStatus: 'idle',
  categoriesError: null,
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

export const fetchCategories = createAsyncThunk<
  StorefrontCategory[],
  void,
  { rejectValue: string; state: RootState }
>(
  'catalog/fetchCategories',
  async (_, { rejectWithValue, signal, getState }) => {
    const tenantId = selectStorefrontTenantId(getState())
    if (!tenantId) {
      return rejectWithValue('La tienda aún no está configurada para este dominio.')
    }

    try {
      return await listStorefrontCategories(tenantId, signal)
    } catch (error) {
      if (signal.aborted) throw error
      return rejectWithValue(normalizeApiError(error).message)
    }
  },
  {
    condition: (_, { getState }) => {
      const { categories, categoriesStatus } = getState().catalog
      return categoriesStatus !== 'loading' && categories.length === 0
    },
  },
)

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
      .addCase(fetchCategories.pending, (state) => {
        state.categoriesStatus = 'loading'
        state.categoriesError = null
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categoriesStatus = 'succeeded'
        state.categories = action.payload
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        if (action.meta.aborted) return
        state.categoriesStatus = 'failed'
        state.categoriesError =
          action.payload ?? action.error.message ?? 'No se pudieron cargar las categorías.'
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
export const selectCategories = (state: CatalogRootState) => state.catalog.categories
export const selectCategoriesStatus = (state: CatalogRootState) => state.catalog.categoriesStatus
