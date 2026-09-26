import type { CatalogQueryState, CatalogSort } from '@/store/catalogSlice'
import styles from './CatalogFilters.module.css'

interface CatalogFiltersProps {
  query: CatalogQueryState
  onQueryChange: (patch: Partial<CatalogQueryState>) => void
}

export function CatalogFilters({ query, onQueryChange }: CatalogFiltersProps) {
  return (
    <div className={styles.filters}>
      <section className={styles.group}>
        <label className={styles.groupTitle} htmlFor="catalog-sort">
          Orden
        </label>
        <select
          id="catalog-sort"
          className={styles.select}
          value={query.sort}
          onChange={(event) => onQueryChange({ sort: event.target.value as CatalogSort })}
        >
          <option value="name">Nombre</option>
          <option value="price_asc">Precio: menor a mayor</option>
          <option value="price_desc">Precio: mayor a menor</option>
          <option value="newest">Más recientes</option>
        </select>
      </section>
    </div>
  )
}
