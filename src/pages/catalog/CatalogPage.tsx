import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { STOREFRONT_FACET_KEYS } from '@/api/types'
import { CatalogFilters } from '@/features/catalog/components/CatalogFilters'
import { ProductGrid, ProductGridSkeleton } from '@/features/catalog/components/ProductGrid'
import { Pagination } from '@/features/catalog/components/Pagination'
import { cx } from '@/lib/cx'
import { formatPrice } from '@/lib/format'
import {
  CATALOG_PAGE_SIZE,
  fetchFacets,
  fetchProducts,
  initialCatalogFilters,
  selectCatalogItems,
  selectCatalogTotalCount,
  selectFacets,
  selectFacetsStatus,
  selectProductsError,
  selectProductsStatus,
} from '@/store/catalogSlice'
import type {
  CatalogFiltersState,
  CatalogQueryState,
  CatalogSort,
} from '@/store/catalogSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectStorefrontName } from '@/store/storefrontSlice'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import styles from './CatalogPage.module.css'

const SORT_VALUES: CatalogSort[] = ['relevance', 'name', 'price_asc', 'price_desc', 'newest']
const FILTERS_ID = 'catalog-filters'

function isCatalogSort(value: string | null): value is CatalogSort {
  return value !== null && (SORT_VALUES as string[]).includes(value)
}

function parseCatalogQuery(params: URLSearchParams): CatalogQueryState {
  const rawPage = Number(params.get('pagina') ?? '1')
  const attributes: Record<string, string[]> = {}

  for (const key of STOREFRONT_FACET_KEYS) {
    const values = params.getAll(key).map((value) => value.trim()).filter(Boolean)
    if (values.length > 0) attributes[key] = values
  }

  return {
    search: params.get('buscar')?.trim() ?? '',
    sort: isCatalogSort(params.get('orden'))
      ? (params.get('orden') as CatalogSort)
      : 'relevance',
    page: Number.isFinite(rawPage) ? Math.max(1, Math.trunc(rawPage)) : 1,
    pageSize: CATALOG_PAGE_SIZE,
    filters: {
      attributes,
      priceMin: params.get('precioMin')?.trim() ?? '',
      priceMax: params.get('precioMax')?.trim() ?? '',
      inStock: params.get('disp') === '1',
      isNew: params.get('nuevo') === '1',
    },
  }
}

function buildSearchParams(query: CatalogQueryState): URLSearchParams {
  const params = new URLSearchParams()
  if (query.search) params.set('buscar', query.search)
  if (query.sort !== 'relevance') params.set('orden', query.sort)
  if (query.page > 1) params.set('pagina', String(query.page))

  for (const key of STOREFRONT_FACET_KEYS) {
    for (const value of query.filters.attributes[key] ?? []) {
      params.append(key, value)
    }
  }

  if (query.filters.priceMin) params.set('precioMin', query.filters.priceMin)
  if (query.filters.priceMax) params.set('precioMax', query.filters.priceMax)
  if (query.filters.inStock) params.set('disp', '1')
  if (query.filters.isNew) params.set('nuevo', '1')

  return params
}

function priceChipLabel(priceMin: string, priceMax: string): string {
  if (priceMin && priceMax) {
    return `Precio: ${formatPrice(Number(priceMin))} – ${formatPrice(Number(priceMax))}`
  }
  if (priceMin) return `Precio: desde ${formatPrice(Number(priceMin))}`
  return `Precio: hasta ${formatPrice(Number(priceMax))}`
}

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [reloadKey, setReloadKey] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const dispatch = useAppDispatch()

  const query = useMemo(() => parseCatalogQuery(searchParams), [searchParams])

  const items = useAppSelector(selectCatalogItems)
  const totalCount = useAppSelector(selectCatalogTotalCount)
  const status = useAppSelector(selectProductsStatus)
  const error = useAppSelector(selectProductsError)
  const facets = useAppSelector(selectFacets)
  const facetsStatus = useAppSelector(selectFacetsStatus)
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
    const request = dispatch(fetchFacets())
    return () => {
      request.abort()
    }
  }, [dispatch])

  useEffect(() => {
    if (!filtersOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFiltersOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filtersOpen])

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

  const updateFilters = (patch: Partial<CatalogFiltersState>) => {
    updateQuery({ filters: { ...query.filters, ...patch } })
  }

  const removeAttributeValue = (key: string, value: string) => {
    const next = (query.filters.attributes[key] ?? []).filter((candidate) => candidate !== value)
    const attributes = { ...query.filters.attributes }
    if (next.length > 0) {
      attributes[key] = next
    } else {
      delete attributes[key]
    }
    updateFilters({ attributes })
  }

  const activeChips: Array<{ id: string; label: string; remove: () => void }> = []
  const attributeByKey = new Map(facets?.attributes.map((attribute) => [attribute.key, attribute]))

  for (const key of STOREFRONT_FACET_KEYS) {
    const selected = query.filters.attributes[key]
    if (!selected?.length) continue
    const attribute = attributeByKey.get(key)
    for (const value of selected) {
      const facetValue = attribute?.values.find((candidate) => candidate.value === value)
      activeChips.push({
        id: `${key}:${value}`,
        label: `${attribute?.label ?? key}: ${facetValue?.label ?? value}`,
        remove: () => removeAttributeValue(key, value),
      })
    }
  }

  if (query.filters.priceMin || query.filters.priceMax) {
    activeChips.push({
      id: 'precio',
      label: priceChipLabel(query.filters.priceMin, query.filters.priceMax),
      remove: () => updateFilters({ priceMin: '', priceMax: '' }),
    })
  }

  if (query.filters.inStock) {
    activeChips.push({
      id: 'disp',
      label: 'Solo disponibles',
      remove: () => updateFilters({ inStock: false }),
    })
  }

  if (query.filters.isNew) {
    activeChips.push({
      id: 'nuevo',
      label: 'Novedades',
      remove: () => updateFilters({ isNew: false }),
    })
  }

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

      {activeChips.length > 0 ? (
        <div className={styles.chips} aria-label="Filtros activos">
          {activeChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={styles.chip}
              onClick={chip.remove}
            >
              <span>{chip.label}</span>
              <span className={styles.chipIcon} aria-hidden="true">
                ×
              </span>
            </button>
          ))}
          <button
            type="button"
            className={styles.clearFilters}
            onClick={() => updateFilters(initialCatalogFilters)}
          >
            Limpiar filtros
          </button>
        </div>
      ) : null}

      {filtersOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Cerrar filtros"
          onClick={() => setFiltersOpen(false)}
        />
      ) : null}

      <div className={styles.layout}>
        <aside
          id={FILTERS_ID}
          className={cx(styles.rail, filtersOpen && styles.railOpen)}
          aria-label="Filtros del catálogo"
        >
          <div className={styles.railPanel}>
            <div className={styles.railHead}>
              <h2 className={styles.railTitle}>Filtros</h2>
              <button
                type="button"
                className={styles.railClose}
                onClick={() => setFiltersOpen(false)}
              >
                Cerrar
              </button>
            </div>
            <CatalogFilters
              facets={facets}
              facetsStatus={facetsStatus}
              query={query}
              onQueryChange={updateQuery}
            />
          </div>
        </aside>

        <section className={styles.results} aria-live="polite" aria-busy={isLoading}>
          <div className={styles.toolbar}>
            <button
              type="button"
              className={styles.filterButton}
              aria-expanded={filtersOpen}
              aria-controls={FILTERS_ID}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              Filtrar{activeChips.length > 0 ? ` (${activeChips.length})` : ''}
            </button>
          </div>

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
                onClick={() =>
                  updateQuery({ search: '', filters: initialCatalogFilters })
                }
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
