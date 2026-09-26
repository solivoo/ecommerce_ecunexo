import { Link, Navigate, useLocation } from 'react-router-dom'
import type { StorefrontOrderResult } from '@/api/types'
import { formatPrice } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { useAppSelector } from '@/store/hooks'
import { selectStorefrontName } from '@/store/storefrontSlice'
import styles from './OrderConfirmedPage.module.css'

const STATUS_LABELS: Record<string, string> = {
  Pending: 'Pendiente',
  Confirmed: 'Confirmado',
  Processing: 'En preparación',
  Shipped: 'Enviado',
  Delivered: 'Entregado',
  Cancelled: 'Cancelado',
}

type ConfirmedOrder = StorefrontOrderResult & {
  paymentMethodLabel?: string
  shippingMethodLabel?: string
  whatsappPhone?: string | null
}

export function OrderConfirmedPage() {
  const location = useLocation()
  const storeName = useAppSelector(selectStorefrontName)
  const order = (location.state as ConfirmedOrder | null) ?? null

  useDocumentTitle(order ? `Pedido ${order.orderNumber} · ${storeName}` : null)

  if (!order) {
    return <Navigate to="/" replace />
  }

  const whatsappNumber = (order.whatsappPhone ?? '').replace(/\D/g, '')
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        `Hola, envío el comprobante de mi pedido ${order.orderNumber} por ${formatPrice(order.totalAmount)}.`,
      )}`
    : null

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Pedido confirmado</p>
        <h1 className={styles.title}>¡Gracias por tu compra!</h1>
        <p className={styles.lead}>
          Tu pedido <strong>{order.orderNumber}</strong> quedó registrado con estado{' '}
          <strong>{STATUS_LABELS[order.status] ?? order.status}</strong>.
        </p>

        <dl className={styles.totals}>
          <div className={styles.totalRow}>
            <dt>Subtotal</dt>
            <dd>{formatPrice(order.subtotal)}</dd>
          </div>
          <div className={styles.totalRow}>
            <dt>Envío</dt>
            <dd>{formatPrice(order.shippingCost)}</dd>
          </div>
          {order.taxAmount > 0 ? (
            <div className={styles.totalRow}>
              <dt>Impuesto</dt>
              <dd>{formatPrice(order.taxAmount)}</dd>
            </div>
          ) : null}
          <div className={`${styles.totalRow} ${styles.grandTotal}`}>
            <dt>Total</dt>
            <dd>{formatPrice(order.totalAmount)}</dd>
          </div>
        </dl>

        <section className={styles.payment}>
          <h2 className={styles.paymentTitle}>Forma de pago</h2>
          <p className={styles.paymentMethod}>
            {order.paymentMethodLabel ?? order.paymentMethod}
          </p>
          {order.shippingMethodLabel ? (
            <p className={styles.paymentMethod}>Entrega: {order.shippingMethodLabel}</p>
          ) : null}
          {order.paymentInstructions ? (
            <pre className={styles.instructions}>{order.paymentInstructions}</pre>
          ) : null}
          <p className={styles.notice}>
            Te contactaremos para confirmar el pago.
          </p>
        </section>

        {whatsappHref ? (
          <a
            className={styles.whatsapp}
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Enviar comprobante por WhatsApp
          </a>
        ) : null}

        <Link to="/" className={styles.action}>
          Seguir comprando
        </Link>
      </div>
    </div>
  )
}
