import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCheckoutOptions } from '@/api/checkoutApi'
import { PriceTag } from '@/features/catalog/components/PriceTag'
import { formatPrice } from '@/lib/format'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  CART_MAX_QUANTITY,
  removeItem,
  selectCartItems,
  selectCartItemsBelowMinQuantity,
  selectCartSubtotal,
  setQuantity,
} from '@/store/cartSlice'
import { selectStorefrontTenantId } from '@/store/storefrontSlice'
import { closeCartDrawer, selectCartDrawerOpen } from '@/store/uiSlice'
import styles from './CartDrawer.module.css'

export function CartDrawer() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const open = useAppSelector(selectCartDrawerOpen)
  const tenantId = useAppSelector(selectStorefrontTenantId)
  const items = useAppSelector(selectCartItems)
  const belowMinItems = useAppSelector(selectCartItemsBelowMinQuantity)
  const subtotal = useAppSelector(selectCartSubtotal)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [minOrderAmount, setMinOrderAmount] = useState(0)

  useEffect(() => {
    if (!open || !tenantId) {
      setMinOrderAmount(0)
      return
    }

    let cancelled = false
    getCheckoutOptions(tenantId)
      .then((options) => {
        if (!cancelled) setMinOrderAmount(options.minOrderAmount ?? 0)
      })
      .catch(() => {
        if (!cancelled) setMinOrderAmount(0)
      })

    return () => {
      cancelled = true
    }
  }, [open, tenantId])

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

  const belowMinAmount = minOrderAmount > 0 && subtotal < minOrderAmount
  const canCheckout =
    items.length > 0 && belowMinItems.length === 0 && !belowMinAmount

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
                        disabled={item.quantity <= (item.minOrderQuantity ?? 1)}
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
                  {item.quantity < (item.minOrderQuantity ?? 1) ? (
                    <p className={styles.minWarning}>
                      Mínimo {item.minOrderQuantity ?? 1} por producto.
                    </p>
                  ) : null}
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
          {belowMinItems.length > 0 ? (
            <p className={styles.minWarning} role="alert">
              Hay productos por debajo de su compra mínima.
            </p>
          ) : null}
          {belowMinAmount ? (
            <p className={styles.minWarning} role="alert">
              El pedido mínimo es {formatPrice(minOrderAmount)}.
            </p>
          ) : null}
          <button
            type="button"
            className={styles.checkout}
            disabled={!canCheckout}
            onClick={goToCheckout}
          >
            Ir a pagar
          </button>
        </footer>
      </aside>
    </div>
  )
}
