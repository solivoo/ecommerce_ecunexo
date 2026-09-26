import { configureStore } from '@reduxjs/toolkit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bootstrapStorefront, storefrontReducer } from './storefrontSlice'

vi.mock('@/api/storefrontApi', () => ({ resolveStorefront: vi.fn() }))

import { resolveStorefront } from '@/api/storefrontApi'

const mockedResolve = vi.mocked(resolveStorefront)

function createStore() {
  return configureStore({ reducer: { storefront: storefrontReducer } })
}

describe('storefrontSlice', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('usa VITE_TENANT_ID como override de desarrollo', async () => {
    vi.stubEnv('VITE_TENANT_ID', 'dev-tenant')
    const store = createStore()

    await store.dispatch(bootstrapStorefront())

    const state = store.getState().storefront
    expect(state.status).toBe('succeeded')
    expect(state.config?.tenantId).toBe('dev-tenant')
    expect(mockedResolve).not.toHaveBeenCalled()
  })

  it('resuelve el tenant por host y guarda la configuración', async () => {
    vi.stubEnv('VITE_TENANT_ID', '')
    mockedResolve.mockResolvedValue({
      tenantId: 't1',
      name: 'Tienda Demo',
      logoUrl: null,
      primaryColorHex: '#2563eb',
      locale: 'es-EC',
      currency: 'USD',
    })

    const store = createStore()
    await store.dispatch(bootstrapStorefront())

    const state = store.getState().storefront
    expect(state.status).toBe('succeeded')
    expect(state.config?.tenantId).toBe('t1')
    expect(state.config?.primaryColorHex).toBe('#2563eb')
    expect(mockedResolve).toHaveBeenCalledWith(window.location.host, expect.anything())
  })

  it('guarda el error cuando el dominio no está publicado', async () => {
    vi.stubEnv('VITE_TENANT_ID', '')
    mockedResolve.mockRejectedValue(new Error('La tienda no está disponible.'))

    const store = createStore()
    await store.dispatch(bootstrapStorefront())

    const state = store.getState().storefront
    expect(state.status).toBe('failed')
    expect(state.error).toBe('La tienda no está disponible.')
  })
})
