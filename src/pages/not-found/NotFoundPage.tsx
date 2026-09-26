import { Link } from 'react-router-dom'
import styles from './NotFoundPage.module.css'

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>No encontramos esta página</h1>
      <p className={styles.lead}>Puede que el enlace haya cambiado o ya no exista.</p>
      <Link to="/" className={styles.action}>
        Ir al catálogo
      </Link>
    </div>
  )
}
