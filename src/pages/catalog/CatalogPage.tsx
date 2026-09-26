import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CatalogFilters } from '@/features/catalog/components/CatalogFilters'
import { ProductGrid, ProductGridSkeleton } from '@/features/catalog/components/ProductGrid'
import { Pagination } from '@/features/catalog/components/Pagination'
import {
  CATALOG_PAGE_SIZE,
  fetchProducts,
  selectCatalogItems,
  selectCatalogTotalCount,
  selectProductsError,
  selectProductsStatus,
} from '@/store/catalogSlice'
import type { CatalogQueryState, CatalogSort } from '@/store/catalogSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectStorefrontName } from '@/store/storefrontSlice'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import styles from './CatalogPage.module.css'

const SORT_VALUES: CatalogSort[] = ['name', 'price_asc', 'price_desc', 'newest']

function isCatalogSort(value: string | null): value is CatalogSort {
  return value !== null && (SORT_VALUES as string[]).includes(value)
}

function parseCatalogQuery(params: URLSearchParams): CatalogQueryState {
  const rawPage = Number(params.get('pagina') ?? '1')

  return {
    search: params.get('buscar')?.trim() ?? '',
    sort: isCatalogSort(params.get('orden')) ? params.get('orden') as CatalogSort : 'name',
    page: Number.isFinite(rawPage) ? Math.max(1, Math.trunc(rawPage)) : 1,
    pageSize: CATALOG_PAGE_SIZE,
  }
}

function buildSearchParams(query: CatalogQueryState): URLSearchParams {
  const params = new URLSearchParams()
  if (query.search) params.set('buscar', query.search)
  if (query.sort !== 'name') params.set('orden', query.sort)
  if (query.page > 1) params.set('pagina', String(query.page))
  return params
}

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [reloadKey, setReloadKey] = useState(0)
  const dispatch = useAppDispatch()

  const query = useMemo(() => parseCatalogQuery(searchParams), [searchParams])

  const items = useAppSelector(selectCatalogItems)
  const totalCount = useAppSelector(selectCatalogTotalCount)
  const status = useAppSelector(selectProductsStatus)
  const error = useAppSelector(selectProductsError)
  const storeName = useAppSelector(selectStorefrontName)

  useDocumentTitle(
    query.search ? `Resultados: ${query.search} · ${storeName}` : `${storeName} · Catálogo`,
  )

  useEffect(() => {
    const request = dispatch(fetchProducts(query))
    return () => {
      request.abort()
    }
  }, [dispatch, query, reloadKey])

  useEffect(() => {
    if (query.page > 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [query.page])

  const updateQuery = useCallback(
    (patch: Partial<CatalogQueryState>) => {
      setSearchParams(buildSearchParams({ ...query, ...patch, page: patch.page ?? 1 }))
    },
    [query, setSearchParams],
  )

  const isLoading = status === 'loading' || status === 'idle'

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Catálogo</h1>
          <p className={styles.lead}>
            {query.search
              ? `Resultados para “${query.search}”`
              : 'Productos con precio y disponibilidad actualizados.'}
          </p>
        </div>
        <p className={styles.count}>
          {status === 'succeeded'
            ? `${totalCount} ${totalCount === 1 ? 'producto' : 'productos'}`
            : '\u00A0'}
        </p>
      </header>

      <div className={styles.layout}>
        <aside className={styles.rail} aria-label="Filtros del catálogo">
          <CatalogFilters query={query} onQueryChange={updateQuery} />
        </aside>

        <section className={styles.results} aria-live="polite" aria-busy={isLoading}>
          {status === 'failed' ? (
            <div className={styles.state}>
              <h2 className={styles.stateTitle}>No se pudo cargar el catálogo</h2>
              <p className={styles.stateText}>{error}</p>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={() => setReloadKey((key) => key + 1)}
              >
                Reintentar
              </button>
            </div>
          ) : isLoading && items.length === 0 ? (
            <ProductGridSkeleton count={8} />
          ) : items.length === 0 ? (
            <div className={styles.state}>
              <h2 className={styles.stateTitle}>Sin productos</h2>
              <p className={styles.stateText}>
                No hay resultados con los filtros seleccionados.
              </p>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={() => updateQuery({ search: '' })}
              >
                Ver todo el catálogo
              </button>
            </div>
          ) : (
            <>
              <div className={styles.gridWrap} data-loading={isLoading}>
                <ProductGrid products={items} />
              </div>
              <Pagination
                page={query.page}
                pageSize={query.pageSize}
                totalCount={totalCount}
                onPageChange={(page) => updateQuery({ page })}
              />
            </>
          )}
        </section>
      </div>
    </div>
  )
}
