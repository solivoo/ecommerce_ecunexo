import { STORE_NAME } from '@/lib/store'
import { useAppSelector } from '@/store/hooks'
import { selectStorefrontConfig } from '@/store/storefrontSlice'
import styles from './StoreFooter.module.css'

export function StoreFooter() {
  const config = useAppSelector(selectStorefrontConfig)
  const storeName = config?.name ?? STORE_NAME

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.brand}>{storeName}</p>
        <p>Precios en USD. Catálogo sujeto a disponibilidad de inventario.</p>
      </div>
    </footer>
  )
}
