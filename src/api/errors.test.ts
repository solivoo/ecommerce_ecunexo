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
  it('extrae el detail y el código de ProblemDetails', () => {
    const error = new AxiosError(
      'Request failed',
      'ERR_BAD_RESPONSE',
      undefined,
      undefined,
      axiosResponse(
        {
          type: 'https://api.ecunexo/errors/ecommerce.order.stock_conflict',
          title: 'Conflicto',
          detail: 'El producto se agotó mientras comprabas.',
        },
        409,
      ),
    )

    expect(normalizeApiError(error)).toEqual({
      status: 409,
      code: 'ecommerce.order.stock_conflict',
      message: 'El producto se agotó mientras comprabas.',
      detail: 'El producto se agotó mientras comprabas.',
    })
  })

  it('traduce los errores de red', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK')

    expect(normalizeApiError(error).message).toContain('No se pudo conectar')
    expect(normalizeApiError(error).status).toBeNull()
    expect(normalizeApiError(error).code).toBeNull()
  })

  it('conserva un ApiError ya normalizado', () => {
    const apiError = { status: 500, code: null, message: 'boom', detail: null }

    expect(normalizeApiError(apiError)).toEqual(apiError)
  })

  it('usa el fallback con valores desconocidos', () => {
    expect(normalizeApiError({}, 'fallback').message).toBe('fallback')
  })
})
