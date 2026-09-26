import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resolveApiUrl } from '@/api/client'
import { STORE_NAME } from '@/lib/store'
import { useAppSelector } from '@/store/hooks'
import { selectStorefrontConfig } from '@/store/storefrontSlice'
import styles from './StoreHeader.module.css'

export function StoreHeader() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const config = useAppSelector(selectStorefrontConfig)
  const storeName = config?.name ?? STORE_NAME
  const logoUrl = config?.logoUrl ? resolveApiUrl(config.logoUrl) : null
  const query = params.get('buscar') ?? ''

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = new FormData(event.currentTarget).get('buscar')
    const term = typeof value === 'string' ? value.trim() : ''
    navigate(term ? `/?buscar=${encodeURIComponent(term)}` : '/')
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          {logoUrl ? <img className={styles.logo} src={logoUrl} alt={storeName} /> : storeName}
        </Link>
        <form className={styles.search} role="search" onSubmit={handleSubmit}>
          <label className="visually-hidden" htmlFor="store-search">
            Buscar productos
          </label>
          <input
            key={query}
            id="store-search"
            name="buscar"
            type="search"
            defaultValue={query}
            placeholder="Buscar en el catálogo"
            autoComplete="off"
          />
          <button type="submit">Buscar</button>
        </form>
      </div>
    </header>
  )
}
