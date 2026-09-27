import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { StorefrontFacetAttribute, StorefrontFacets } from '@/api/types'
import { cx } from '@/lib/cx'
import { formatPrice } from '@/lib/format'
import type {
  CatalogFiltersState,
  CatalogQueryState,
  CatalogSort,
} from '@/store/catalogSlice'
import type { RequestStatus } from '@/store/requestStatus'
import { isHexColorValue, resolveColorHex } from '../utils/colorSwatch'
import styles from './CatalogFilters.module.css'

interface CatalogFiltersProps {
  facets: StorefrontFacets | null
  facetsStatus: RequestStatus
  query: CatalogQueryState
  onQueryChange: (patch: Partial<CatalogQueryState>) => void
}

const MAX_VISIBLE_VALUES = 8

function swatchStyle(label: string): CSSProperties | undefined {
  const hex = resolveColorHex(label)
  return hex ? { backgroundColor: hex } : undefined
}

interface FacetGroupProps {
  attribute: StorefrontFacetAttribute
  selected: string[]
  onToggle: (value: string) => void
}

function FacetGroup({ attribute, selected, onToggle }: FacetGroupProps) {
  const [expanded, setExpanded] = useState(false)
  const hasMore = attribute.values.length > MAX_VISIBLE_VALUES
  const values =
    hasMore && !expanded ? attribute.values.slice(0, MAX_VISIBLE_VALUES) : attribute.values
  const isColor = attribute.key === 'color'

  return (
    <section className={styles.group} aria-labelledby={`facet-${attribute.key}`}>
      <h2 id={`facet-${attribute.key}`} className={styles.groupTitle}>
        {attribute.label}
      </h2>
      <div className={styles.list}>
        {values.map((facetValue) => {
          const checked = selected.includes(facetValue.value)
          const hex = isColor ? resolveColorHex(facetValue.label) : null
          const hideLabel = isColor && isHexColorValue(facetValue.label)
          return (
            <label
              key={facetValue.value}
              className={cx(styles.option, checked && styles.optionActive)}
            >
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={checked}
                onChange={() => onToggle(facetValue.value)}
              />
              {hex ? (
                <span
                  className={styles.swatch}
                  style={swatchStyle(facetValue.label)}
                  title={facetValue.label}
                  aria-hidden="true"
                />
              ) : null}
              {hideLabel ? (
                <span className="visually-hidden">{facetValue.label}</span>
              ) : (
                <span className={styles.optionLabel}>{facetValue.label}</span>
              )}
              <span className={styles.optionCount}>{facetValue.count}</span>
            </label>
          )
        })}
      </div>
      {hasMore ? (
        <button
          type="button"
          className={styles.moreButton}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
      ) : null}
    </section>
  )
}

export function CatalogFilters({
  facets,
  facetsStatus,
  query,
  onQueryChange,
}: CatalogFiltersProps) {
  const filters = query.filters

  const updateFilters = (patch: Partial<CatalogFiltersState>) => {
    onQueryChange({ filters: { ...filters, ...patch } })
  }

  const toggleAttribute = (key: string, value: string) => {
    const current = filters.attributes[key] ?? []
    const next = current.includes(value)
      ? current.filter((candidate) => candidate !== value)
      : [...current, value]

    const attributes = { ...filters.attributes }
    if (next.length > 0) {
      attributes[key] = next
    } else {
      delete attributes[key]
    }

    updateFilters({ attributes })
  }

  const handlePriceSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    updateFilters({
      priceMin: String(data.get('precioMin') ?? '').trim(),
      priceMax: String(data.get('precioMax') ?? '').trim(),
    })
  }

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
          <option value="relevance">Relevancia</option>
          <option value="name">Nombre</option>
          <option value="price_asc">Precio: menor a mayor</option>
          <option value="price_desc">Precio: mayor a menor</option>
          <option value="newest">Más recientes</option>
          <option value="likes">Más gustados</option>
        </select>
      </section>

      {facetsStatus === 'loading' && !facets ? (
        <p className={styles.hint}>Cargando filtros…</p>
      ) : null}
      {facetsStatus === 'failed' && !facets ? (
        <p className={styles.hint}>No se pudieron cargar los filtros.</p>
      ) : null}

      {facets?.attributes.map((attribute) => (
        <FacetGroup
          key={attribute.key}
          attribute={attribute}
          selected={filters.attributes[attribute.key] ?? []}
          onToggle={(value) => toggleAttribute(attribute.key, value)}
        />
      ))}

      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Precio</h2>
        <form
          key={`${filters.priceMin}|${filters.priceMax}`}
          className={styles.priceForm}
          onSubmit={handlePriceSubmit}
        >
          <input
            type="number"
            name="precioMin"
            className={styles.priceInput}
            aria-label="Precio mínimo"
            placeholder="Mín"
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={filters.priceMin}
          />
          <span className={styles.priceDash} aria-hidden="true">
            –
          </span>
          <input
            type="number"
            name="precioMax"
            className={styles.priceInput}
            aria-label="Precio máximo"
            placeholder="Máx"
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={filters.priceMax}
          />
          <button type="submit" className={styles.applyButton}>
            Aplicar
          </button>
        </form>
        {facets?.priceMin != null && facets.priceMax != null ? (
          <p className={styles.hint}>
            Rango disponible: {formatPrice(facets.priceMin)} – {formatPrice(facets.priceMax)}
          </p>
        ) : null}
      </section>

      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Disponibilidad</h2>
        <div className={styles.toggles}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={filters.inStock}
              onChange={(event) => updateFilters({ inStock: event.target.checked })}
            />
            <span>Solo disponibles</span>
          </label>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={filters.isNew}
              onChange={(event) => updateFilters({ isNew: event.target.checked })}
            />
            <span>Novedades</span>
          </label>
        </div>
      </section>
    </div>
  )
}
