import axios from 'axios'
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type { Store } from '@reduxjs/toolkit'
import type { RootState } from '@/app/store'
import { beginRequest, endRequest, setHttpMessage } from '@/store/uiSlice'
import { normalizeApiError } from './errors'

export const TENANT_HEADER = 'X-EcuNexo-Tenant-Id'
export const REQUEST_ID_HEADER = 'X-Request-Id'

export const tenantId = (import.meta.env.VITE_TENANT_ID ?? '').trim()

let storeRef: Store<RootState> | null = null
let authTokenProvider: () => string | null = () => null

export function configureApiClient(store: Store<RootState>): void {
  storeRef = store
}

export function setAuthTokenProvider(provider: () => string | null): void {
  authTokenProvider = provider
}

export const api: AxiosInstance = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL ?? '').trim(),
  timeout: 20_000,
  headers: { Accept: 'application/json' },
})

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const base = api.defaults.baseURL ?? ''
  return `${base}${path}`
}

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (storeRef) storeRef.dispatch(beginRequest())

  config.headers.set(REQUEST_ID_HEADER, createRequestId())
  if (tenantId) config.headers.set(TENANT_HEADER, tenantId)

  const token = authTokenProvider()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)

  if (config.data instanceof FormData) config.headers.delete('Content-Type')

  return config
})

api.interceptors.response.use(
  (response) => {
    if (storeRef) storeRef.dispatch(endRequest())
    return response
  },
  (error: AxiosError) => {
    if (storeRef) storeRef.dispatch(endRequest())

    if (axios.isCancel(error)) return Promise.reject(error)

    const apiError = normalizeApiError(error)
    const shouldNotify =
      apiError.status === null || apiError.status === 429 || apiError.status >= 500

    if (storeRef && shouldNotify) {
      storeRef.dispatch(setHttpMessage(apiError.message))
    }

    return Promise.reject(apiError)
  },
)
