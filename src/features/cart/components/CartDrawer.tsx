import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { calculateStorefrontQuote, getCheckoutOptions } from '@/api/checkoutApi'
import { isApiError } from '@/api/errors'
import type { StorefrontCheckoutQuote } from '@/api/types'
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
  const [quote, setQuote] = useState<StorefrontCheckoutQuote | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !tenantId) {
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
    if (!open || !tenantId || items.length === 0) {
      return
    }
    if (typeof calculateStorefrontQuote !== 'function') return

    const controller = new AbortController()
    const quotePromise = calculateStorefrontQuote(
      tenantId,
      {
        items: items.map((item) => ({
          catalogItemId: item.catalogItemId,
          quantity: item.quantity,
        })),
      },
      controller.signal,
    )

    if (!quotePromise || typeof quotePromise.then !== 'function') {
      return () => controller.abort()
    }

    quotePromise
      .then((data) => {
        if (controller.signal.aborted) return
        setQuote(data ?? null)
        setQuoteError(null)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setQuote(null)
        const msg = isApiError(err)
          ? err.message
          : err instanceof Error
            ? err.message
            : null
        setQuoteError(msg)
      })

    return () => controller.abort()
  }, [open, tenantId, items])

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

  const activeQuote = open && items.length > 0 ? quote : null
  const activeQuoteError = open && items.length > 0 ? quoteError : null
  const displaySubtotal = activeQuote
    ? Math.round((activeQuote.subtotal + activeQuote.taxAmount) * 100) / 100
    : subtotal
  const belowMinAmount = minOrderAmount > 0 && displaySubtotal < minOrderAmount
  const canCheckout =
    items.length > 0 && belowMinItems.length === 0 && !belowMinAmount && !activeQuoteError

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
            {items.map((item) => {
              const quoteLine = activeQuote?.items.find(
                (line) => line.catalogItemId === item.catalogItemId,
              )
              const linePrice = quoteLine ? quoteLine.lineTotal : item.price * item.quantity
              const lineOriginal = quoteLine
                ? quoteLine.lineDiscount > 0
                  ? quoteLine.lineGross
                  : null
                : item.originalPrice
                  ? item.originalPrice * item.quantity
                  : null
              const lineDiscountPercent = quoteLine
                ? (quoteLine.discountPercent ?? null)
                : item.discountPercent

              return (
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
                        price={linePrice}
                        originalPrice={lineOriginal}
                        discountPercent={lineDiscountPercent}
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
              )
            })}
          </ul>
        )}

        <footer className={styles.foot}>
          {activeQuote && activeQuote.promotionDiscountAmount > 0 ? (
            <p className={styles.discountRow}>
              <span>Descuento paquetes / promo</span>
              <strong>-{formatPrice(activeQuote.promotionDiscountAmount)}</strong>
            </p>
          ) : null}
          <p className={styles.subtotal}>
            <span>Subtotal</span>
            <strong>{formatPrice(displaySubtotal)}</strong>
          </p>
          {activeQuoteError ? (
            <p className={styles.notice} role="alert">
              {activeQuoteError}
            </p>
          ) : null}
          {belowMinItems.length > 0 ? (
            <p className={styles.notice} role="alert">
              Hay productos por debajo de su compra mínima.
            </p>
          ) : null}
          {belowMinAmount ? (
            <p className={styles.notice} role="alert">
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
