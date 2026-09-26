import { AxiosError } from 'axios'
import type { AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it } from 'vitest'
import { store } from '@/app/store'
import { clearHttpMessage } from '@/store/uiSlice'
import { api, configureApiClient, REQUEST_ID_HEADER } from './client'

function axiosResponse(data: unknown, status = 200): AxiosResponse {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {},
  } as unknown as AxiosResponse
}

describe('api client', () => {
  beforeEach(() => {
    configureApiClient(store)
    store.dispatch(clearHttpMessage())
  })

  it('marca la solicitud como pendiente y añade X-Request-Id', async () => {
    let pendingDuringRequest = 0
    let requestId = ''

    api.defaults.adapter = async (config) => {
      pendingDuringRequest = store.getState().ui.pendingHttp
      requestId = String(config.headers.get(REQUEST_ID_HEADER) ?? '')
      return axiosResponse({ ok: true })
    }

    const response = await api.get('/ping')

    expect(response.data).toEqual({ ok: true })
    expect(pendingDuringRequest).toBe(1)
    expect(store.getState().ui.pendingHttp).toBe(0)
    expect(requestId.length).toBeGreaterThan(0)
  })

  it('normaliza ProblemDetails y publica el mensaje global en 5xx', async () => {
    api.defaults.adapter = async (config) => {
      throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, {
        data: { detail: 'Servicio no disponible.' },
        status: 503,
        statusText: 'Service Unavailable',
        headers: {},
        config,
      } as unknown as AxiosResponse)
    }

    await expect(api.get('/ping')).rejects.toMatchObject({
      status: 503,
      message: 'Servicio no disponible.',
    })
    expect(store.getState().ui.pendingHttp).toBe(0)
    expect(store.getState().ui.httpMessage).toBe('Servicio no disponible.')
  })

  it('no publica mensaje global en 404', async () => {
    api.defaults.adapter = async (config) => {
      throw new AxiosError('Not found', 'ERR_BAD_REQUEST', config, undefined, {
        data: { detail: 'El producto no está disponible.' },
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config,
      } as unknown as AxiosResponse)
    }

    await expect(api.get('/ping')).rejects.toMatchObject({ status: 404 })
    expect(store.getState().ui.httpMessage).toBeNull()
  })
})
