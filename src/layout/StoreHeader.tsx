import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { resolveApiUrl } from '@/api/client'
import { STOREFRONT_FACET_KEYS } from '@/api/types'
import { STORE_NAME } from '@/lib/store'
import { selectCartCount } from '@/store/cartSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectStorefrontConfig } from '@/store/storefrontSlice'
import { openCartDrawer, selectFilterDrawerOpen, toggleFilterDrawer } from '@/store/uiSlice'
import styles from './StoreHeader.module.css'

const CATALOG_FILTERS_ID = 'catalog-filters'

function FilterIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  )
}

export function StoreHeader() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { pathname } = useLocation()
  const config = useAppSelector(selectStorefrontConfig)
  const cartCount = useAppSelector(selectCartCount)
  const filtersOpen = useAppSelector(selectFilterDrawerOpen)
  const storeName = config?.name ?? STORE_NAME
  const logoUrl = config?.logoUrl ? resolveApiUrl(config.logoUrl) : null
  const query = params.get('buscar') ?? ''
  const isCatalog = pathname === '/'
  const activeFilterCount =
    STOREFRONT_FACET_KEYS.reduce((total, key) => total + params.getAll(key).length, 0) +
    (params.get('precioMin') ? 1 : 0) +
    (params.get('precioMax') ? 1 : 0) +
    (params.get('disp') === '1' ? 1 : 0) +
    (params.get('nuevo') === '1' ? 1 : 0)

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
        <div className={styles.headerEnd}>
          {isCatalog ? (
            <button
              type="button"
              className={styles.filter}
              aria-label={
                activeFilterCount > 0
                  ? `Filtrar productos, ${activeFilterCount} filtros activos`
                  : 'Filtrar productos'
              }
              aria-expanded={filtersOpen}
              aria-controls={CATALOG_FILTERS_ID}
              onClick={() => dispatch(toggleFilterDrawer())}
            >
              <FilterIcon />
              {activeFilterCount > 0 ? (
                <span className={styles.badge}>{activeFilterCount}</span>
              ) : null}
            </button>
          ) : null}
          <button
            type="button"
            className={styles.cart}
            aria-label={
              cartCount > 0 ? `Abrir carrito, ${cartCount} artículos` : 'Abrir carrito'
            }
            onClick={() => dispatch(openCartDrawer())}
          >
            Carrito
            {cartCount > 0 ? <span className={styles.badge}>{cartCount}</span> : null}
          </button>
        </div>
      </div>
    </header>
  )
}
