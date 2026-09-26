import { describe, expect, it } from 'vitest'
import {
  beginRequest,
  clearHttpMessage,
  closeCartDrawer,
  endRequest,
  openCartDrawer,
  setHttpMessage,
  uiReducer,
} from './uiSlice'

describe('uiSlice', () => {
  it('inicia sin solicitudes pendientes ni mensajes', () => {
    const state = uiReducer(undefined, { type: 'init' })
    expect(state).toEqual({ pendingHttp: 0, httpMessage: null, cartDrawerOpen: false })
  })

  it('cuenta solicitudes pendientes sin bajar de cero', () => {
    let state = uiReducer(undefined, beginRequest())
    state = uiReducer(state, beginRequest())
    expect(state.pendingHttp).toBe(2)

    state = uiReducer(state, endRequest())
    state = uiReducer(state, endRequest())
    state = uiReducer(state, endRequest())
    expect(state.pendingHttp).toBe(0)
  })

  it('guarda y limpia el mensaje global', () => {
    let state = uiReducer(undefined, setHttpMessage('Sin conexión'))
    expect(state.httpMessage).toBe('Sin conexión')

    state = uiReducer(state, clearHttpMessage())
    expect(state.httpMessage).toBeNull()
  })

  it('abre y cierra el drawer del carrito', () => {
    let state = uiReducer(undefined, openCartDrawer())
    expect(state.cartDrawerOpen).toBe(true)

    state = uiReducer(state, closeCartDrawer())
    expect(state.cartDrawerOpen).toBe(false)
  })
})
