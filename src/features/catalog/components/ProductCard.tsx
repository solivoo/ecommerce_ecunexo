import { Link } from 'react-router-dom'
import type { StorefrontProduct } from '@/api/types'
import { formatPrice } from '@/lib/format'
import { resolveColorHex } from '../utils/colorSwatch'
import styles from './ProductCard.module.css'

interface ProductCardProps {
  product: StorefrontProduct
}

const MAX_VISIBLE_COLORS = 5

export function ProductCard({ product }: ProductCardProps) {
  const imageUrl = product.mediumUrl ?? product.thumbUrl
  const hiddenColors = product.colors.length - MAX_VISIBLE_COLORS

  return (
    <Link to={`/producto/${product.id}`} className={styles.card}>
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
      <div className={styles.body}>
        <h3 className={styles.name}>{product.name}</h3>
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
          <p className={styles.price}>{formatPrice(product.price)}</p>
          {product.hasVariants ? (
            <p className={styles.variants}>
              {product.variantCount} {product.variantCount === 1 ? 'opción' : 'opciones'}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
