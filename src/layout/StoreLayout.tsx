import { useEffect } from 'react'
import { Outlet, ScrollRestoration } from 'react-router-dom'
import { resolveApiUrl } from '@/api/client'
import { GlobalStatus } from '@/app/GlobalStatus'
import { StoreUpdatingGuard } from '@/app/StoreUpdatingGuard'
import { CartDrawer } from '@/features/cart/components/CartDrawer'
import { letterFavicon, setFavicon } from '@/lib/favicon'
import { STORE_NAME } from '@/lib/store'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  bootstrapStorefront,
  selectStorefrontConfig,
  selectStorefrontError,
  selectStorefrontStatus,
} from '@/store/storefrontSlice'
import { StoreFooter } from './StoreFooter'
import { StoreHeader } from './StoreHeader'
import styles from './StoreLayout.module.css'

export function StoreLayout() {
  const dispatch = useAppDispatch()
  const config = useAppSelector(selectStorefrontConfig)
  const status = useAppSelector(selectStorefrontStatus)
  const error = useAppSelector(selectStorefrontError)

  useEffect(() => {
    dispatch(bootstrapStorefront())
  }, [dispatch])

  useEffect(() => {
    if (!config) return
    if (config.primaryColorHex) {
      document.documentElement.style.setProperty('--store-accent', config.primaryColorHex)
    }
    setFavicon(
      config.logoUrl
        ? resolveApiUrl(config.logoUrl)
        : letterFavicon(config.name, config.primaryColorHex),
    )
  }, [config])

  if (!config) {
    return (
      <div className={styles.splash}>
        <GlobalStatus />
        <div className={styles.splashContent}>
          <p className={styles.splashBrand}>{STORE_NAME}</p>
          {status === 'failed' ? (
            <>
              <h1 className={styles.splashTitle}>Tienda no disponible</h1>
              <p className={styles.splashText}>{error}</p>
            </>
          ) : (
            <p className={styles.splashText}>Cargando tienda…</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.shell}>
      <GlobalStatus />
      <StoreHeader />
      <CartDrawer />
      <main className={styles.main}>
        <Outlet />
      </main>
      <StoreFooter />
      <StoreUpdatingGuard />
      <ScrollRestoration />
    </div>
  )
}
