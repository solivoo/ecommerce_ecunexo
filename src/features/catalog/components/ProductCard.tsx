import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { StorefrontProduct } from '@/api/types'
import { LikeButton } from '@/features/likes/LikeButton'
import { addItem } from '@/store/cartSlice'
import { useAppDispatch } from '@/store/hooks'
import { resolveColorHex } from '../utils/colorSwatch'
import { PriceTag } from './PriceTag'
import styles from './ProductCard.module.css'

interface ProductCardProps {
  product: StorefrontProduct
}

const MAX_VISIBLE_COLORS = 5

export function ProductCard({ product }: ProductCardProps) {
  const dispatch = useAppDispatch()
  const imageUrl = product.mediumUrl ?? product.thumbUrl
  const hiddenColors = product.colors.length - MAX_VISIBLE_COLORS
  const canAdd = !product.hasVariants && product.inStock && product.price !== null
  const [added, setAdded] = useState(false)
  const addedTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (addedTimer.current !== null) {
        window.clearTimeout(addedTimer.current)
      }
    },
    [],
  )

  function handleAdd() {
    if (product.price === null) return
    dispatch(
      addItem({
        catalogItemId: product.id,
        name: product.name,
        sku: null,
        price: product.price,
        originalPrice: product.originalPrice ?? null,
        discountPercent: product.discountPercent ?? null,
        quantity: 1,
        thumbUrl: product.thumbUrl,
      }),
    )
    setAdded(true)
    if (addedTimer.current !== null) {
      window.clearTimeout(addedTimer.current)
    }
    addedTimer.current = window.setTimeout(() => setAdded(false), 1800)
  }

  return (
    <article className={styles.card}>
      <div className={styles.mediaWrap}>
        <Link
          to={`/producto/${product.id}`}
          className={styles.mediaLink}
          aria-label={product.name}
        >
          <div className={styles.media}>
            {imageUrl ? (
              <>
                <img
                  className={styles.imagePrimary}
                  src={imageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                {product.secondMediumUrl ? (
                  <img
                    className={styles.imageSecondary}
                    src={product.secondMediumUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
              </>
            ) : (
              <span className={styles.placeholder} aria-hidden="true" />
            )}
            {product.isNew ? <span className={styles.new}>Nuevo</span> : null}
            {!product.inStock ? <span className={styles.soldOut}>Agotado</span> : null}
          </div>
        </Link>
        <LikeButton
          productId={product.id}
          likeCount={product.likeCount}
          className={styles.likeOverlay}
        />
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>
          <Link to={`/producto/${product.id}`}>{product.name}</Link>
        </h3>
        {product.colors.length > 0 ? (
          <ul className={styles.swatches} aria-label="Colores disponibles">
            {product.colors.slice(0, MAX_VISIBLE_COLORS).map((color) => {
              const hex = resolveColorHex(color)
              return (
                <li key={color}>
                  <span
                    className={styles.swatch}
                    style={hex ? { backgroundColor: hex } : undefined}
                    title={color}
                  >
                    <span className="visually-hidden">{color}</span>
                  </span>
                </li>
              )
            })}
            {hiddenColors > 0 ? <li className={styles.moreColors}>+{hiddenColors}</li> : null}
          </ul>
        ) : null}
        <div className={styles.footer}>
          <PriceTag
            price={product.price}
            originalPrice={product.originalPrice}
            discountPercent={product.discountPercent}
          />
          {product.hasVariants ? (
            <Link to={`/producto/${product.id}`} className={styles.ctaSecondary}>
              Elegir opciones
            </Link>
          ) : product.inStock ? (
            <button
              type="button"
              className={`${styles.cta} ${added ? styles.ctaAdded : ''}`}
              disabled={!canAdd}
              onClick={handleAdd}
            >
              {added ? 'Agregado ✓' : 'Agregar'}
            </button>
          ) : (
            <button type="button" className={styles.cta} disabled>
              Agotado
            </button>
          )}
        </div>
        <span className="visually-hidden" role="status">
          {added ? `${product.name} se agregó al carrito` : ''}
        </span>
      </div>
    </article>
  )
}
