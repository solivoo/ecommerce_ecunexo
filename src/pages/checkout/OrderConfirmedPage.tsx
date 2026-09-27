import { useRef, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { uploadPaymentProof } from '@/api/checkoutApi'
import { normalizeApiError } from '@/api/errors'
import type { PaymentProofUploadResult, StorefrontOrderResult } from '@/api/types'
import { formatPrice } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { useAppSelector } from '@/store/hooks'
import {
  selectStorefrontName,
  selectStorefrontTenantId,
} from '@/store/storefrontSlice'
import styles from './OrderConfirmedPage.module.css'

const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024

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
  const tenantId = useAppSelector(selectStorefrontTenantId)
  const order = (location.state as ConfirmedOrder | null) ?? null

  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofUploading, setProofUploading] = useState(false)
  const [proofError, setProofError] = useState<string | null>(null)
  const [proofUploaded, setProofUploaded] =
    useState<PaymentProofUploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useDocumentTitle(order ? `Pedido ${order.orderNumber} · ${storeName}` : null)

  if (!order) {
    return <Navigate to="/" replace />
  }

  async function handleProofSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProofError(null)

    if (!order || !tenantId || !order.paymentProofToken) return

    if (!proofFile) {
      setProofError('Selecciona un archivo para subir.')
      return
    }

    if (proofFile.size > MAX_PROOF_SIZE_BYTES) {
      setProofError('El comprobante no puede superar los 5 MB.')
      return
    }

    setProofUploading(true)
    try {
      const result = await uploadPaymentProof(
        tenantId,
        order.orderId,
        order.paymentProofToken,
        proofFile,
      )
      setProofUploaded(result)
      setProofFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      setProofError(normalizeApiError(error).message)
    } finally {
      setProofUploading(false)
    }
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

        {order.paymentProofToken ? (
          <section className={styles.proof} aria-label="Subir comprobante">
            <h2 className={styles.proofTitle}>Subir comprobante</h2>
            <p className={styles.proofHint}>
              Adjunta tu comprobante en JPG, PNG, WEBP o PDF (máx. 5 MB).
            </p>

            {proofUploaded ? (
              <p className={styles.proofSuccess} role="status">
                Comprobante recibido: {proofUploaded.fileName}
              </p>
            ) : null}

            <form className={styles.proofForm} onSubmit={handleProofSubmit}>
              <input
                ref={fileInputRef}
                id="payment-proof-file"
                aria-label="Archivo del comprobante"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(event) => {
                  setProofFile(event.target.files?.[0] ?? null)
                  setProofError(null)
                }}
              />

              {proofError ? (
                <p className={styles.proofError} role="alert">
                  {proofError}
                </p>
              ) : null}

              <button
                type="submit"
                className={styles.proofAction}
                disabled={proofUploading || !proofFile}
              >
                {proofUploading ? 'Subiendo…' : 'Enviar comprobante'}
              </button>
            </form>
          </section>
        ) : null}

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
