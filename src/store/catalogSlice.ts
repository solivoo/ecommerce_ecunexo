import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { listStorefrontFacets, listStorefrontProducts } from '@/api/catalogApi'
import { normalizeApiError } from '@/api/errors'
import type {
  CatalogQuery,
  StorefrontFacets,
  StorefrontProduct,
  StorefrontProductPage,
} from '@/api/types'
import type { RootState } from '@/app/store'
import { selectStorefrontTenantId } from './storefrontSlice'
import type { RequestStatus } from './requestStatus'

export type CatalogSort = 'relevance' | 'name' | 'price_asc' | 'price_desc' | 'newest'

export interface CatalogFiltersState {
  attributes: Record<string, string[]>
  priceMin: string
  priceMax: string
  inStock: boolean
  isNew: boolean
}

export interface CatalogQueryState {
  search: string
  sort: CatalogSort
  page: number
  pageSize: number
  filters: CatalogFiltersState
}

export const CATALOG_PAGE_SIZE = 24

export const initialCatalogFilters: CatalogFiltersState = {
  attributes: {},
  priceMin: '',
  priceMax: '',
  inStock: false,
  isNew: false,
}

export const initialCatalogQuery: CatalogQueryState = {
  search: '',
  sort: 'relevance',
  page: 1,
  pageSize: CATALOG_PAGE_SIZE,
  filters: initialCatalogFilters,
}

export interface CatalogState {
  items: StorefrontProduct[]
  totalCount: number
  appliedQuery: CatalogQueryState
  productsStatus: RequestStatus
  productsError: string | null
  productsRequestId: string | null
  facets: StorefrontFacets | null
  facetsStatus: RequestStatus
  facetsRequestId: string | null
}

const initialState: CatalogState = {
  items: [],
  totalCount: 0,
  appliedQuery: initialCatalogQuery,
  productsStatus: 'idle',
  productsError: null,
  productsRequestId: null,
  facets: null,
  facetsStatus: 'idle',
  facetsRequestId: null,
}

function parsePrice(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : undefined
}

function toStorefrontQuery(query: CatalogQueryState): CatalogQuery {
  const attributes = query.filters.attributes

  return {
    search: query.search,
    sort: query.sort,
    page: query.page,
    pageSize: query.pageSize,
    talla: attributes.talla,
    color: attributes.color,
    actividad: attributes.actividad,
    cana: attributes.cana,
    material: attributes.material,
    marca: attributes.marca,
    coleccion: attributes.coleccion,
    priceMin: parsePrice(query.filters.priceMin),
    priceMax: parsePrice(query.filters.priceMax),
    inStock: query.filters.inStock,
    isNew: query.filters.isNew,
  }
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
    const page = await listStorefrontProducts(tenantId, toStorefrontQuery(query), signal)
    return { page, query }
  } catch (error) {
    if (signal.aborted) throw error
    return rejectWithValue(normalizeApiError(error).message)
  }
})

export const fetchFacets = createAsyncThunk<
  StorefrontFacets,
  void,
  { rejectValue: string; state: RootState }
>(
  'catalog/fetchFacets',
  async (_, { rejectWithValue, signal, getState }) => {
    const tenantId = selectStorefrontTenantId(getState())
    if (!tenantId) {
      return rejectWithValue('La tienda aún no está configurada para este dominio.')
    }

    try {
      return await listStorefrontFacets(tenantId, signal)
    } catch (error) {
      if (signal.aborted) throw error
      return rejectWithValue(normalizeApiError(error).message)
    }
  },
  {
    condition: (_, { getState }) => {
      const status = getState().catalog.facetsStatus
      return status !== 'loading' && status !== 'succeeded'
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
      state.facets = null
      state.facetsStatus = 'idle'
      state.facetsRequestId = null
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
      .addCase(fetchFacets.pending, (state, action) => {
        state.facetsStatus = 'loading'
        state.facetsRequestId = action.meta.requestId
      })
      .addCase(fetchFacets.fulfilled, (state, action) => {
        if (state.facetsRequestId !== action.meta.requestId) return
        state.facetsStatus = 'succeeded'
        state.facets = action.payload
        state.facetsRequestId = null
      })
      .addCase(fetchFacets.rejected, (state, action) => {
        if (state.facetsRequestId !== action.meta.requestId) return
        state.facetsRequestId = null
        state.facetsStatus = action.meta.aborted ? 'idle' : 'failed'
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
export const selectFacets = (state: CatalogRootState) => state.catalog.facets
export const selectFacetsStatus = (state: CatalogRootState) => state.catalog.facetsStatus
