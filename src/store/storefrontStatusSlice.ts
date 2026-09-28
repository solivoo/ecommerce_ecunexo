import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { getStorefrontStatus } from '@/api/catalogApi'
import type { StorefrontStatus } from '@/api/types'
import type { RequestStatus } from './requestStatus'
import { selectStorefrontTenantId, type StorefrontState } from './storefrontSlice'

export const REVISION_STORAGE_KEY = 'storefront.catalogRevision'

/** Chequeos consecutivos con la misma revisión antes de recargar (catálogo estable). */
const STABLE_CHECKS_TO_RELOAD = 2

export interface StorefrontStatusState {
  /** Revisión con la que se renderizó el contenido que ve el visitante. */
  appliedRevision: string | null
  /** Revisión nueva detectada, a la espera de estabilizarse. */
  pendingRevision: string | null
  stableChecks: number
  isUpdating: boolean
  shouldReload: boolean
  status: RequestStatus
}

export interface StatusTransition {
  appliedRevision: string | null
  pendingRevision: string | null
  stableChecks: number
  isUpdating: boolean
  shouldReload: boolean
}

function readStoredRevision(): string | null {
  try {
    return window.sessionStorage.getItem(REVISION_STORAGE_KEY)
  } catch {
    return null
  }
}

function storeRevision(revision: string): void {
  try {
    window.sessionStorage.setItem(REVISION_STORAGE_KEY, revision)
  } catch {
    // almacenamiento no disponible: no es crítico
  }
}

/**
 * Máquina de estados de la revisión del catálogo:
 * - La primera revisión se adopta en silencio (es la que ya se está mostrando).
 * - Un cambio respecto a la revisión aplicada levanta la cortina de "actualizando".
 * - Cuando la revisión se mantiene estable N chequeos, se recarga para traer datos frescos.
 */
export function resolveStatusTransition(
  state: Pick<
    StorefrontStatusState,
    'appliedRevision' | 'pendingRevision' | 'stableChecks' | 'isUpdating'
  >,
  nextRevision: string,
): StatusTransition {
  if (state.appliedRevision === null) {
    return {
      appliedRevision: nextRevision,
      pendingRevision: null,
      stableChecks: 0,
      isUpdating: false,
      shouldReload: false,
    }
  }

  if (!state.isUpdating) {
    if (nextRevision === state.appliedRevision) {
      return { ...state, shouldReload: false }
    }

    return {
      appliedRevision: state.appliedRevision,
      pendingRevision: nextRevision,
      stableChecks: 1,
      isUpdating: true,
      shouldReload: false,
    }
  }

  if (nextRevision === state.pendingRevision) {
    const stableChecks = state.stableChecks + 1
    if (stableChecks >= STABLE_CHECKS_TO_RELOAD) {
      return {
        appliedRevision: nextRevision,
        pendingRevision: null,
        stableChecks: 0,
        isUpdating: false,
        shouldReload: true,
      }
    }

    return { ...state, stableChecks, shouldReload: false }
  }

  return {
    appliedRevision: state.appliedRevision,
    pendingRevision: nextRevision,
    stableChecks: 1,
    isUpdating: true,
    shouldReload: false,
  }
}

const initialState: StorefrontStatusState = {
  appliedRevision: readStoredRevision(),
  pendingRevision: null,
  stableChecks: 0,
  isUpdating: false,
  shouldReload: false,
  status: 'idle',
}

export const checkStorefrontStatus = createAsyncThunk<
  StorefrontStatus | null,
  void,
  { state: { storefront: StorefrontState } }
>('storefrontStatus/check', async (_, { getState }) => {
  const tenantId = selectStorefrontTenantId(getState())
  if (!tenantId) return null

  const status = await getStorefrontStatus(tenantId)
  return status
})

const slice = createSlice({
  name: 'storefrontStatus',
  initialState,
  reducers: {
    acknowledgeReload(state) {
      state.shouldReload = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkStorefrontStatus.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(checkStorefrontStatus.rejected, (state) => {
        state.status = 'failed'
      })
      .addCase(checkStorefrontStatus.fulfilled, (state, action) => {
        state.status = 'succeeded'
        const payload = action.payload
        if (!payload) return

        const transition = resolveStatusTransition(state, payload.revision)
        state.appliedRevision = transition.appliedRevision
        state.pendingRevision = transition.pendingRevision
        state.stableChecks = transition.stableChecks
        state.isUpdating = transition.isUpdating
        state.shouldReload = transition.shouldReload

        if (transition.appliedRevision !== null) {
          storeRevision(transition.appliedRevision)
        }
      })
  },
})

export const { acknowledgeReload } = slice.actions
export const storefrontStatusReducer = slice.reducer

interface StorefrontStatusRootState {
  storefrontStatus: StorefrontStatusState
}

export const selectStorefrontIsUpdating = (state: StorefrontStatusRootState): boolean =>
  state.storefrontStatus.isUpdating

export const selectStorefrontShouldReload = (state: StorefrontStatusRootState): boolean =>
  state.storefrontStatus.shouldReload
