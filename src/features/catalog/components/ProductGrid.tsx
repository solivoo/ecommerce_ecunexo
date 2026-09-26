import type { StorefrontProduct } from '@/api/types'
import { ProductCard } from './ProductCard'
import styles from './ProductGrid.module.css'

interface ProductGridProps {
  products: StorefrontProduct[]
}

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <ul className={styles.grid}>
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className={styles.grid} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className={styles.skeletonCard}>
          <div className={styles.skeletonMedia} />
          <div className={styles.skeletonBody}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
          </div>
        </li>
      ))}
    </ul>
  )
}
