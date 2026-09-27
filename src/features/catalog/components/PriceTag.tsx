import { discountPercentFrom, formatPrice } from '@/lib/format'
import styles from './PriceTag.module.css'

interface PriceTagProps {
  readonly price: number | null
  readonly originalPrice?: number | null
  readonly discountPercent?: number | null
  readonly size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASS: Record<NonNullable<PriceTagProps['size']>, string> = {
  sm: styles.tagSmall,
  md: '',
  lg: styles.tagLarge,
}

export function PriceTag({
  price,
  originalPrice = null,
  discountPercent = null,
  size = 'md',
}: PriceTagProps) {
  const percent = discountPercent ?? discountPercentFrom(originalPrice, price)
  const hasDiscount = percent !== null && originalPrice !== null && originalPrice > (price ?? 0)

  return (
    <span className={`${styles.tag} ${SIZE_CLASS[size]}`.trim()}>
      {hasDiscount ? (
        <>
          <span className={styles.badge}>-{percent}%</span>
          <s className={styles.original}>{formatPrice(originalPrice)}</s>
        </>
      ) : null}
      <span className={styles.price}>{formatPrice(price)}</span>
    </span>
  )
}
