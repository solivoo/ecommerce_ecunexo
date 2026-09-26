import axios from 'axios'
import type { AxiosError } from 'axios'

export interface ApiError {
  status: number | null
  code: string | null
  message: string
  detail: string | null
}

interface ProblemDetails {
  type?: string
  title?: string
  detail?: string
  message?: string
  error?: string
}

const FALLBACK_MESSAGE = 'Ocurrió un error inesperado. Inténtalo de nuevo.'

export function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) return false
  if ('isAxiosError' in value) return false

  const candidate = value as Partial<ApiError>
  return (
    typeof candidate.message === 'string'
    && (candidate.status === null || typeof candidate.status === 'number')
    && (candidate.code === null || typeof candidate.code === 'string')
    && (candidate.detail === null || typeof candidate.detail === 'string')
  )
}

function problemCode(type: string | undefined): string | null {
  if (!type) return null
  const raw = type.includes('/errors/') ? type.split('/errors/').pop()! : type
  try {
    return decodeURIComponent(raw) || null
  } catch {
    return raw || null
  }
}

export function normalizeApiError(error: unknown, fallback = FALLBACK_MESSAGE): ApiError {
  if (isApiError(error)) return error

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ProblemDetails>
    const data = axiosError.response?.data
    const status = axiosError.response?.status ?? null

    if (!axiosError.response) {
      return { status, code: null, message: transportErrorMessage(axiosError), detail: null }
    }

    const message =
      data?.detail ?? data?.message ?? data?.title ?? data?.error ?? fallback

    return {
      status,
      code: problemCode(data?.type),
      message,
      detail: data?.detail ?? null,
    }
  }

  if (error instanceof Error && error.message) {
    return { status: null, code: null, message: error.message, detail: null }
  }

  return { status: null, code: null, message: fallback, detail: null }
}

function transportErrorMessage(error: AxiosError): string {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return 'La solicitud tardó demasiado. Vuelve a intentarlo.'
  }
  return 'No se pudo conectar con el servidor. Revisa tu conexión.'
}
