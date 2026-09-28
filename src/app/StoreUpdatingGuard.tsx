import { useEffect } from 'react'
import { resolveApiUrl } from '@/api/client'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectStorefrontConfig, selectStorefrontTenantId } from '@/store/storefrontSlice'
import {
  acknowledgeReload,
  checkStorefrontStatus,
  selectStorefrontIsUpdating,
  selectStorefrontShouldReload,
} from '@/store/storefrontStatusSlice'
import styles from './StoreUpdatingGuard.module.css'

const NORMAL_INTERVAL_MS = 15000
const UPDATING_INTERVAL_MS = 2000
const SAFE_ROUTES = ['/checkout', '/pedido']

/**
 * Vigila la revisión del catálogo y, cuando cambia, tapa la tienda con una
 * pantalla de "Estamos actualizando" hasta recargar con datos frescos.
 * No interrumpe checkout ni pedidos confirmados.
 */
export function StoreUpdatingGuard() {
  const dispatch = useAppDispatch()
  const tenantId = useAppSelector(selectStorefrontTenantId)
  const config = useAppSelector(selectStorefrontConfig)
  const isUpdating = useAppSelector(selectStorefrontIsUpdating)
  const shouldReload = useAppSelector(selectStorefrontShouldReload)

  useEffect(() => {
    if (!tenantId) return
    let cancelled = false

    const run = () => {
      if (cancelled) return
      const path = window.location.pathname
      if (SAFE_ROUTES.some((route) => path.startsWith(route))) return
      if (document.visibilityState === 'hidden') return
      void dispatch(checkStorefrontStatus())
    }

    run()
    const interval = window.setInterval(run, isUpdating ? UPDATING_INTERVAL_MS : NORMAL_INTERVAL_MS)
    const onFocus = () => run()
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
    }
  }, [dispatch, isUpdating, tenantId])

  useEffect(() => {
    if (!shouldReload) return
    dispatch(acknowledgeReload())
    window.location.reload()
  }, [dispatch, shouldReload])

  if (!isUpdating || !config) return null

  return (
    <div className={styles.overlay} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.card}>
        {config.logoUrl ? (
          <img
            className={styles.logo}
            src={resolveApiUrl(config.logoUrl)}
            alt={config.name}
          />
        ) : (
          <span className={styles.logoFallback} aria-hidden>
            ◆
          </span>
        )}
        <h2 className={styles.title}>Estamos actualizando la tienda</h2>
        <p className={styles.text}>
          Estamos publicando cambios para que veas la información más reciente. Volvemos en unos
          segundos.
        </p>
        <div className={styles.progress} aria-hidden>
          <span />
        </div>
        <p className={styles.hint}>No cierres esta página.</p>
      </div>
    </div>
  )
}
