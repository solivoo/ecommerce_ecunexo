import type { StorefrontCategory } from '@/api/types'
import { cx } from '@/lib/cx'
import type { CatalogQueryState, CatalogSort } from '@/store/catalogSlice'
import type { RequestStatus } from '@/store/requestStatus'
import styles from './CatalogFilters.module.css'

interface CatalogFiltersProps {
  categories: StorefrontCategory[]
  categoriesStatus: RequestStatus
  query: CatalogQueryState
  onQueryChange: (patch: Partial<CatalogQueryState>) => void
}

interface FlatCategory {
  category: StorefrontCategory
  depth: number
}

function flattenCategories(categories: StorefrontCategory[]): FlatCategory[] {
  const childrenByParent = new Map<string | null, StorefrontCategory[]>()
  for (const category of categories) {
    const list = childrenByParent.get(category.parentId) ?? []
    list.push(category)
    childrenByParent.set(category.parentId, list)
  }

  const flat: FlatCategory[] = []
  const visited = new Set<string>()

  const walk = (parentId: string | null, depth: number) => {
    for (const category of childrenByParent.get(parentId) ?? []) {
      if (visited.has(category.id)) continue
      visited.add(category.id)
      flat.push({ category, depth })
      walk(category.id, depth + 1)
    }
  }

  walk(null, 0)

  for (const category of categories) {
    if (!visited.has(category.id)) {
      visited.add(category.id)
      flat.push({ category, depth: 0 })
    }
  }

  return flat
}

export function CatalogFilters({
  categories,
  categoriesStatus,
  query,
  onQueryChange,
}: CatalogFiltersProps) {
  const flatCategories = flattenCategories(categories)

  return (
    <div className={styles.filters}>
      <section>
        <h2 className={styles.groupTitle}>Categorías</h2>
        {categoriesStatus === 'loading' ? <p className={styles.hint}>Cargando…</p> : null}
        <div className={styles.list}>
          <button
            type="button"
            className={cx(styles.item, query.categoryId === null && styles.itemActive)}
            onClick={() => onQueryChange({ categoryId: null })}
          >
            Todas
          </button>
          {flatCategories.map(({ category, depth }) => (
            <button
              key={category.id}
              type="button"
              className={cx(styles.item, query.categoryId === category.id && styles.itemActive)}
              style={{ paddingInlineStart: `${depth * 12 + 8}px` }}
              onClick={() => onQueryChange({ categoryId: category.id })}
            >
              {category.name}
            </button>
          ))}
        </div>
      </section>

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
