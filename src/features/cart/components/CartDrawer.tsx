import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PriceTag } from '@/features/catalog/components/PriceTag'
import { formatPrice } from '@/lib/format'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  CART_MAX_QUANTITY,
  removeItem,
  selectCartItems,
  selectCartSubtotal,
  setQuantity,
} from '@/store/cartSlice'
import { closeCartDrawer, selectCartDrawerOpen } from '@/store/uiSlice'
import styles from './CartDrawer.module.css'

export function CartDrawer() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const open = useAppSelector(selectCartDrawerOpen)
  const items = useAppSelector(selectCartItems)
  const subtotal = useAppSelector(selectCartSubtotal)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeButtonRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatch(closeCartDrawer())
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, open])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  if (!open) return null

  const close = () => dispatch(closeCartDrawer())

  const goToCheckout = () => {
    dispatch(closeCartDrawer())
    navigate('/checkout')
  }

  return (
    <div className={styles.layer}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Cerrar carrito"
        onClick={close}
      />
      <aside
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
      >
        <header className={styles.head}>
          <h2 className={styles.title}>Tu carrito</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.close}
            onClick={close}
          >
            Cerrar
          </button>
        </header>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <p>Tu carrito está vacío.</p>
            <Link to="/" className={styles.secondary} onClick={close}>
              Ver catálogo
            </Link>
          </div>
        ) : (
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.catalogItemId} className={styles.item}>
                {item.thumbUrl ? (
                  <img className={styles.thumb} src={item.thumbUrl} alt="" />
                ) : (
                  <span className={styles.thumbPlaceholder} aria-hidden="true" />
                )}
                <div className={styles.itemBody}>
                  <p className={styles.itemName}>{item.name}</p>
                  {item.sku ? (
                    <p className={styles.itemSku}>SKU: {item.sku}</p>
                  ) : null}
                  <div className={styles.itemFooter}>
                    <div
                      className={styles.quantity}
                      role="group"
                      aria-label={`Cantidad de ${item.name}`}
                    >
                      <button
                        type="button"
                        aria-label={`Quitar una unidad de ${item.name}`}
                        disabled={item.quantity <= 1}
                        onClick={() =>
                          dispatch(
                            setQuantity({
                              catalogItemId: item.catalogItemId,
                              quantity: item.quantity - 1,
                            }),
                          )
                        }
                      >
                        −
                      </button>
                      <span aria-live="polite">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Agregar una unidad de ${item.name}`}
                        disabled={item.quantity >= CART_MAX_QUANTITY}
                        onClick={() =>
                          dispatch(
                            setQuantity({
                              catalogItemId: item.catalogItemId,
                              quantity: item.quantity + 1,
                            }),
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                    <PriceTag
                      size="sm"
                      price={item.price * item.quantity}
                      originalPrice={
                        item.originalPrice ? item.originalPrice * item.quantity : null
                      }
                      discountPercent={item.discountPercent}
                    />
                  </div>
                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => dispatch(removeItem(item.catalogItemId))}
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <footer className={styles.foot}>
          <p className={styles.subtotal}>
            <span>Subtotal</span>
            <strong>{formatPrice(subtotal)}</strong>
          </p>
          <button
            type="button"
            className={styles.checkout}
            disabled={items.length === 0}
            onClick={goToCheckout}
          >
            Ir a pagar
          </button>
        </footer>
      </aside>
    </div>
  )
}
