import { useState } from 'react'
import type { StorefrontImage } from '@/api/types'
import { cx } from '@/lib/cx'
import styles from './ProductGallery.module.css'

interface ProductGalleryProps {
  images: StorefrontImage[]
  productName: string
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = images[activeIndex] ?? images[0]

  if (!active) {
    return (
      <div className={styles.empty} aria-hidden="true">
        Sin imagen
      </div>
    )
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.stage}>
        <img src={active.largeUrl || active.mediumUrl} alt={active.altText ?? productName} />
      </div>
      {images.length > 1 ? (
        <ul className={styles.thumbs}>
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                className={cx(styles.thumb, index === activeIndex && styles.thumbActive)}
                aria-label={`Ver imagen ${index + 1}`}
                aria-current={index === activeIndex}
                onClick={() => setActiveIndex(index)}
              >
                <img src={image.thumbUrl} alt="" loading="lazy" decoding="async" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
