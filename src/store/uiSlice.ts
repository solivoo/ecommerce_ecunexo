import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface UiState {
  pendingHttp: number
  httpMessage: string | null
  cartDrawerOpen: boolean
  filterDrawerOpen: boolean
}

const initialState: UiState = {
  pendingHttp: 0,
  httpMessage: null,
  cartDrawerOpen: false,
  filterDrawerOpen: false,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    beginRequest(state) {
      state.pendingHttp += 1
    },
    endRequest(state) {
      state.pendingHttp = Math.max(0, state.pendingHttp - 1)
    },
    setHttpMessage(state, action: PayloadAction<string | null>) {
      state.httpMessage = action.payload
    },
    clearHttpMessage(state) {
      state.httpMessage = null
    },
    openCartDrawer(state) {
      state.cartDrawerOpen = true
    },
    closeCartDrawer(state) {
      state.cartDrawerOpen = false
    },
    toggleFilterDrawer(state) {
      state.filterDrawerOpen = !state.filterDrawerOpen
    },
    closeFilterDrawer(state) {
      state.filterDrawerOpen = false
    },
  },
})

export const {
  beginRequest,
  endRequest,
  setHttpMessage,
  clearHttpMessage,
  openCartDrawer,
  closeCartDrawer,
  toggleFilterDrawer,
  closeFilterDrawer,
} = uiSlice.actions

export const uiReducer = uiSlice.reducer

export function selectPendingHttp(state: { ui: UiState }): number {
  return state.ui.pendingHttp
}

export function selectHttpMessage(state: { ui: UiState }): string | null {
  return state.ui.httpMessage
}

export function selectCartDrawerOpen(state: { ui: UiState }): boolean {
  return state.ui.cartDrawerOpen
}

export function selectFilterDrawerOpen(state: { ui: UiState }): boolean {
  return state.ui.filterDrawerOpen
}
