import { cx } from '@/lib/cx'
import styles from './Pagination.module.css'

interface PaginationProps {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
}

function pageWindow(page: number, totalPages: number): number[] {
  const size = Math.min(5, totalPages)
  let start = Math.max(1, page - Math.floor(size / 2))
  const end = Math.min(totalPages, start + size - 1)
  start = Math.max(1, end - size + 1)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

export function Pagination({ page, pageSize, totalCount, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  if (totalPages <= 1) return null

  const pages = pageWindow(page, totalPages)

  return (
    <nav className={styles.pagination} aria-label="Paginación">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Anterior
      </button>
      {pages.map((candidate) => (
        <button
          key={candidate}
          type="button"
          aria-current={candidate === page ? 'page' : undefined}
          className={cx(styles.pageButton, candidate === page && styles.active)}
          onClick={() => onPageChange(candidate)}
        >
          {candidate}
        </button>
      ))}
      <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Siguiente
      </button>
    </nav>
  )
}
