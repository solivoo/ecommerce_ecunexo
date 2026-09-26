import { clearHttpMessage, selectHttpMessage, selectPendingHttp } from '@/store/uiSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import styles from './GlobalStatus.module.css'

export function GlobalStatus() {
  const pending = useAppSelector(selectPendingHttp)
  const message = useAppSelector(selectHttpMessage)
  const dispatch = useAppDispatch()

  return (
    <>
      {pending > 0 ? (
        <div className={styles.progressTrack} aria-hidden="true">
          <div className={styles.progressBar} />
        </div>
      ) : null}
      {message ? (
        <div className={styles.banner} role="alert">
          <p>{message}</p>
          <button type="button" onClick={() => dispatch(clearHttpMessage())}>
            Cerrar
          </button>
        </div>
      ) : null}
    </>
  )
}
