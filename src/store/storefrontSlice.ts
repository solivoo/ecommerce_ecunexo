import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { normalizeApiError } from '@/api/errors'
import { listStorefrontColors } from '@/api/catalogApi'
import { resolveStorefront } from '@/api/storefrontApi'
import type { StorefrontColor, StorefrontConfig } from '@/api/types'
import { STORE_NAME } from '@/lib/store'
import type { RequestStatus } from './requestStatus'

export interface StorefrontState {
  config: StorefrontConfig | null
  status: RequestStatus
  error: string | null
  colorPalette: StorefrontColor[]
}

const initialState: StorefrontState = {
  config: null,
  status: 'idle',
  error: null,
  colorPalette: [],
}

export const bootstrapStorefront = createAsyncThunk<
  StorefrontConfig,
  void,
  { rejectValue: string; state: { storefront: StorefrontState } }
>(
  'storefront/bootstrap',
  async (_, { rejectWithValue, signal }) => {
    const devTenantId = (import.meta.env.VITE_TENANT_ID ?? '').trim()
    if (devTenantId) {
      return {
        tenantId: devTenantId,
        name: STORE_NAME,
        logoUrl: null,
        primaryColorHex: null,
        locale: 'es-EC',
        currency: 'USD',
      }
    }

    try {
      return await resolveStorefront(window.location.host, signal)
    } catch (error) {
      if (signal.aborted) throw error
      return rejectWithValue(
        normalizeApiError(error, 'No se pudo cargar la tienda para este dominio.').message,
      )
    }
  },
  {
    condition: (_, { getState }) => getState().storefront.status === 'idle',
  },
)

export const loadStorefrontColorPalette = createAsyncThunk<
  StorefrontColor[],
  string,
  { rejectValue: string }
>(
  'storefront/loadColorPalette',
  async (tenantId, { signal, rejectWithValue }) => {
    try {
      return await listStorefrontColors(tenantId, signal)
    } catch (error) {
      if (signal.aborted) throw error
      return rejectWithValue(normalizeApiError(error, 'No se pudo cargar la paleta de colores.').message)
    }
  },
)

const storefrontSlice = createSlice({
  name: 'storefront',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapStorefront.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(bootstrapStorefront.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.config = action.payload
      })
      .addCase(bootstrapStorefront.rejected, (state, action) => {
        if (action.meta.aborted) return
        state.status = 'failed'
        state.error =
          action.payload ?? action.error.message ?? 'No se pudo cargar la tienda.'
      })
      .addCase(loadStorefrontColorPalette.fulfilled, (state, action) => {
        state.colorPalette = action.payload
      })
  },
})

export const storefrontReducer = storefrontSlice.reducer

export interface StorefrontRootState {
  storefront?: StorefrontState
}

export function selectStorefrontConfig(state: StorefrontRootState): StorefrontConfig | null {
  return state.storefront?.config ?? null
}

export function selectStorefrontStatus(state: StorefrontRootState): RequestStatus {
  return state.storefront?.status ?? 'loading'
}

export function selectStorefrontError(state: StorefrontRootState): string | null {
  return state.storefront?.error ?? null
}

const EMPTY_COLOR_PALETTE: StorefrontColor[] = []

export function selectStorefrontColorPalette(state: StorefrontRootState): StorefrontColor[] {
  return state.storefront?.colorPalette ?? EMPTY_COLOR_PALETTE
}

export function selectStorefrontName(state: StorefrontRootState): string {
  return state.storefront?.config?.name ?? STORE_NAME
}

export function selectStorefrontTenantId(state: StorefrontRootState): string | null {
  return state.storefront?.config?.tenantId ?? null
}
