import { Link } from 'react-router-dom'
import type { StorefrontProduct } from '@/api/types'
import { formatPrice } from '@/lib/format'
import styles from './ProductCard.module.css'

interface ProductCardProps {
  product: StorefrontProduct
}

export function ProductCard({ product }: ProductCardProps) {
  const imageUrl = product.mediumUrl ?? product.thumbUrl

  return (
    <Link to={`/producto/${product.id}`} className={styles.card}>
      <div className={styles.media}>
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className={styles.placeholder} aria-hidden="true" />
        )}
        {!product.inStock ? <span className={styles.soldOut}>Agotado</span> : null}
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{product.name}</h3>
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
