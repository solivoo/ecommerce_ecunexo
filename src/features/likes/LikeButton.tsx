import type { MouseEvent } from 'react'
import { cx } from '@/lib/cx'
import { useProductLike } from './useProductLike'
import styles from './LikeButton.module.css'

interface LikeButtonProps {
  productId: string
  likeCount: number
  className?: string
  showCount?: boolean
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={styles.heart}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LikeButton({
  productId,
  likeCount,
  className,
  showCount = true,
}: LikeButtonProps) {
  const { liked, likeCount: count, pending, toggle } = useProductLike(productId, likeCount)

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    toggle()
  }

  return (
    <button
      type="button"
      className={cx(styles.button, liked && styles.liked, className)}
      aria-pressed={liked}
      aria-label={liked ? 'Quitar me gusta' : 'Me gusta'}
      aria-busy={pending}
      onClick={handleClick}
    >
      <HeartIcon filled={liked} />
      {showCount ? (
        <span className={styles.count} aria-hidden="true">
          {count}
        </span>
      ) : null}
    </button>
  )
}
