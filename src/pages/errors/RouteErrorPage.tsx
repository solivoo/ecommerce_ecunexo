import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import styles from './RouteErrorPage.module.css'

export function RouteErrorPage() {
  const error = useRouteError()

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'No se pudo cargar esta página.'

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Algo salió mal</h1>
      <p className={styles.message}>{message}</p>
      <Link to="/" className={styles.action}>
        Volver al catálogo
      </Link>
    </div>
  )
}
