import { AxiosError } from 'axios'
import type { AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import { normalizeApiError } from './errors'

function axiosResponse(data: unknown, status: number): AxiosResponse {
  return {
    data,
    status,
    statusText: 'Error',
    headers: {},
    config: {},
  } as unknown as AxiosResponse
}

describe('normalizeApiError', () => {
  it('extrae el detail de ProblemDetails', () => {
    const error = new AxiosError(
      'Request failed',
      'ERR_BAD_RESPONSE',
      undefined,
      undefined,
      axiosResponse({ title: 'Validación', detail: 'El tenant no existe.' }, 404),
    )

    expect(normalizeApiError(error)).toEqual({
      status: 404,
      message: 'El tenant no existe.',
      detail: 'El tenant no existe.',
    })
  })

  it('traduce los errores de red', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK')

    expect(normalizeApiError(error).message).toContain('No se pudo conectar')
    expect(normalizeApiError(error).status).toBeNull()
  })

  it('conserva un ApiError ya normalizado', () => {
    const apiError = { status: 500, message: 'boom', detail: null }

    expect(normalizeApiError(apiError)).toEqual(apiError)
  })

  it('usa el fallback con valores desconocidos', () => {
    expect(normalizeApiError({}, 'fallback').message).toBe('fallback')
  })
})
