import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { createStorefrontOrder, getCheckoutOptions } from '@/api/checkoutApi'
import { normalizeApiError } from '@/api/errors'
import type {
  CheckoutOptions,
  CreateStorefrontOrderInput,
  StorefrontOrderResult,
} from '@/api/types'
import { formatPrice, roundCurrency } from '@/lib/format'
import { createId } from '@/lib/id'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { clearCart, selectCartItems, selectCartSubtotal } from '@/store/cartSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  selectStorefrontName,
  selectStorefrontTenantId,
} from '@/store/storefrontSlice'
import { openCartDrawer } from '@/store/uiSlice'
import styles from './CheckoutPage.module.css'

type OptionsStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

interface CheckoutFormState {
  name: string
  email: string
  phone: string
  taxId: string
  address: string
  city: string
  reference: string
  notes: string
}

type CheckoutFormErrors = Partial<Record<keyof CheckoutFormState, string>>

const EMPTY_FORM: CheckoutFormState = {
  name: '',
  email: '',
  phone: '',
  taxId: '',
  address: '',
  city: '',
  reference: '',
  notes: '',
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+\d][\d\s\-()]{6,}$/

function elapsedMsSince(start: number): number {
  return start > 0 ? Date.now() - start : 0
}

function validateForm(form: CheckoutFormState): CheckoutFormErrors {
  const errors: CheckoutFormErrors = {}

  if (!form.name.trim()) errors.name = 'Ingresa tu nombre.'
  if (!form.email.trim()) {
    errors.email = 'Ingresa tu email.'
  } else if (!EMAIL_PATTERN.test(form.email.trim())) {
    errors.email = 'Ingresa un email válido.'
  }
  if (!form.phone.trim()) {
    errors.phone = 'Ingresa tu teléfono.'
  } else if (!PHONE_PATTERN.test(form.phone.trim())) {
    errors.phone = 'Ingresa un teléfono válido.'
  }
  if (!form.address.trim()) errors.address = 'Ingresa tu dirección.'
  if (!form.city.trim()) errors.city = 'Ingresa tu ciudad.'

  return errors
}

export function CheckoutPage() {
  const tenantId = useAppSelector(selectStorefrontTenantId)
  const storeName = useAppSelector(selectStorefrontName)
  const items = useAppSelector(selectCartItems)
  const subtotal = useAppSelector(selectCartSubtotal)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const [options, setOptions] = useState<CheckoutOptions | null>(null)
  const [optionsStatus, setOptionsStatus] = useState<OptionsStatus>('loading')
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [optionsReloadKey, setOptionsReloadKey] = useState(0)
  const [form, setForm] = useState<CheckoutFormState>(EMPTY_FORM)
  const [website, setWebsite] = useState('')
  const startedAtRef = useRef(0)

  useEffect(() => {
    startedAtRef.current = Date.now()
  }, [])
  const [errors, setErrors] = useState<CheckoutFormErrors>({})
  const [paymentChoice, setPaymentChoice] = useState('')
  const [shippingChoice, setShippingChoice] = useState('')
  const [saving, setSaving] = useState(false)
  const [placed, setPlaced] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [stockConflict, setStockConflict] = useState(false)
  const requestIdRef = useRef<string | null>(null)

  useDocumentTitle(`Checkout · ${storeName}`)

  useEffect(() => {
    if (!tenantId) return
    const controller = new AbortController()

    getCheckoutOptions(tenantId, controller.signal)
      .then((data) => {
        setOptions(data)
        setOptionsStatus('succeeded')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setOptionsStatus('failed')
        setOptionsError(normalizeApiError(error).message)
      })

    return () => controller.abort()
  }, [tenantId, optionsReloadKey])

  const reloadOptions = (clear = true) => {
    if (clear) {
      setOptions(null)
      setOptionsError(null)
      setOptionsStatus('loading')
    }
    setOptionsReloadKey((key) => key + 1)
  }

  if (items.length === 0 && !placed) {
    return <Navigate to="/" replace />
  }

  const paymentMethod = options?.paymentMethods.some(
    (method) => method.code === paymentChoice,
  )
    ? paymentChoice
    : (options?.paymentMethods[0]?.code ?? '')
  const shippingMethod = options?.shippingMethods.some(
    (method) => method.code === shippingChoice,
  )
    ? shippingChoice
    : (options?.shippingMethods[0]?.code ?? '')
  const selectedPayment =
    options?.paymentMethods.find((method) => method.code === paymentMethod) ?? null
  const selectedShipping =
    options?.shippingMethods.find((method) => method.code === shippingMethod) ?? null
  const shippingCost = selectedShipping?.cost ?? 0
  const total = roundCurrency(subtotal + shippingCost)

  const updateField =
    (field: keyof CheckoutFormState) => (value: string) => {
      setForm((current) => ({ ...current, [field]: value }))
      setErrors((current) => ({ ...current, [field]: undefined }))
    }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)
    setStockConflict(false)

    if (!tenantId || !options || items.length === 0) return

    if (!paymentMethod || !shippingMethod) {
      setSubmitError('Selecciona un método de pago y uno de envío.')
      return
    }

    const validationErrors = validateForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    requestIdRef.current ??= createId()

    const input: CreateStorefrontOrderInput = {
      requestId: requestIdRef.current,
      customer: {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        taxId: form.taxId.trim() ? form.taxId.trim() : null,
      },
      shipping: {
        address: form.address.trim(),
        city: form.city.trim(),
        reference: form.reference.trim() ? form.reference.trim() : null,
      },
      paymentMethod,
      shippingMethod,
      items: items.map((item) => ({
        catalogItemId: item.catalogItemId,
        quantity: item.quantity,
      })),
      notes: form.notes.trim() ? form.notes.trim() : null,
      website: website.trim() ? website : null,
      formElapsedMs: elapsedMsSince(startedAtRef.current),
    }

    setSaving(true)
    try {
      const result: StorefrontOrderResult = await createStorefrontOrder(tenantId, input)
      setPlaced(true)
      navigate('/pedido/confirmado', {
        state: {
          ...result,
          paymentMethodLabel: selectedPayment?.label,
          shippingMethodLabel: selectedShipping?.label,
          whatsappPhone: options?.whatsappPhone ?? null,
        },
      })
      dispatch(clearCart())
    } catch (error) {
      const apiError = normalizeApiError(error)
      if (
        apiError.status === 409 &&
        apiError.code === 'ecommerce.order.stock_conflict'
      ) {
        setStockConflict(true)
        setSubmitError(apiError.message)
        reloadOptions(false)
      } else {
        setSubmitError(apiError.message)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <nav aria-label="Ruta de navegación" className={styles.breadcrumb}>
        <Link to="/">Catálogo</Link>
        <span aria-hidden="true">›</span>
        <span className={styles.current}>Checkout</span>
      </nav>

      <h1 className={styles.title}>Finalizar compra</h1>

      {optionsStatus === 'loading' ? (
        <p className={styles.stateText} role="status">
          Cargando métodos de pago y envío…
        </p>
      ) : optionsStatus === 'failed' ? (
        <div className={styles.state}>
          <h2 className={styles.stateTitle}>No se pudo iniciar el checkout</h2>
          <p className={styles.stateText}>{optionsError}</p>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={() => reloadOptions()}
          >
            Reintentar
          </button>
        </div>
      ) : options ? (
        <form className={styles.layout} noValidate onSubmit={handleSubmit}>
          <input
            type="text"
            name="website"
            className={styles.honeypot}
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />
          <section className={styles.formColumn} aria-label="Datos del pedido">
            <fieldset className={styles.group}>
              <legend className={styles.legend}>Tus datos</legend>
              <TextField
                id="checkout-name"
                label="Nombre completo"
                value={form.name}
                error={errors.name}
                required
                autoComplete="name"
                onChange={updateField('name')}
              />
              <TextField
                id="checkout-email"
                label="Email"
                type="email"
                value={form.email}
                error={errors.email}
                required
                autoComplete="email"
                onChange={updateField('email')}
              />
              <TextField
                id="checkout-phone"
                label="Teléfono"
                type="tel"
                value={form.phone}
                error={errors.phone}
                required
                autoComplete="tel"
                onChange={updateField('phone')}
              />
              <TextField
                id="checkout-tax-id"
                label="Cédula / RUC"
                value={form.taxId}
                autoComplete="off"
                onChange={updateField('taxId')}
              />
            </fieldset>

            <fieldset className={styles.group}>
              <legend className={styles.legend}>Entrega</legend>
              <TextField
                id="checkout-address"
                label="Dirección"
                value={form.address}
                error={errors.address}
                required
                autoComplete="street-address"
                onChange={updateField('address')}
              />
              <TextField
                id="checkout-city"
                label="Ciudad"
                value={form.city}
                error={errors.city}
                required
                autoComplete="address-level2"
                onChange={updateField('city')}
              />
              <TextField
                id="checkout-reference"
                label="Referencia"
                value={form.reference}
                autoComplete="off"
                onChange={updateField('reference')}
              />
            </fieldset>

            <fieldset className={styles.group}>
              <legend className={styles.legend}>Método de pago</legend>
              <div className={styles.optionList}>
                {options.paymentMethods.map((method) => (
                  <label key={method.code} className={styles.option}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.code}
                      checked={paymentMethod === method.code}
                      onChange={() => setPaymentChoice(method.code)}
                    />
                    <span className={styles.optionBody}>
                      <span className={styles.optionLabel}>{method.label}</span>
                      {paymentMethod === method.code && method.instructions ? (
                        <span className={styles.optionHint}>
                          {method.instructions}
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className={styles.group}>
              <legend className={styles.legend}>Método de envío</legend>
              <div className={styles.optionList}>
                {options.shippingMethods.map((method) => (
                  <label key={method.code} className={styles.option}>
                    <input
                      type="radio"
                      name="shippingMethod"
                      value={method.code}
                      checked={shippingMethod === method.code}
                      onChange={() => setShippingChoice(method.code)}
                    />
                    <span className={styles.optionBody}>
                      <span className={styles.optionLabel}>{method.label}</span>
                      <span className={styles.optionCost}>
                        {method.cost > 0 ? formatPrice(method.cost) : 'Gratis'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className={styles.field}>
              <label htmlFor="checkout-notes">Notas (opcional)</label>
              <textarea
                id="checkout-notes"
                rows={3}
                value={form.notes}
                onChange={(event) => updateField('notes')(event.target.value)}
              />
            </div>
          </section>

          <aside className={styles.summary} aria-label="Resumen del pedido">
            <h2 className={styles.summaryTitle}>Resumen</h2>
            <ul className={styles.summaryItems}>
              {items.map((item) => (
                <li key={item.catalogItemId} className={styles.summaryItem}>
                  <span className={styles.summaryItemName}>
                    {item.name} × {item.quantity}
                  </span>
                  <span className={styles.summaryItemPrice}>
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className={styles.totals}>
              <div className={styles.totalRow}>
                <dt>Subtotal</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              <div className={styles.totalRow}>
                <dt>Envío</dt>
                <dd>{selectedShipping ? formatPrice(shippingCost) : '—'}</dd>
              </div>
              <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                <dt>Total</dt>
                <dd>{formatPrice(total)}</dd>
              </div>
            </dl>

            <button
              type="button"
              className={styles.secondaryAction}
              onClick={() => dispatch(openCartDrawer())}
            >
              Editar carrito
            </button>

            {submitError ? (
              <div className={styles.alert} role="alert">
                <p>{submitError}</p>
                {stockConflict ? (
                  <div className={styles.alertActions}>
                    <button
                      type="button"
                      className={styles.alertButton}
                      onClick={() => dispatch(openCartDrawer())}
                    >
                      Revisar carrito
                    </button>
                    <button
                      type="button"
                      className={styles.alertButton}
                      onClick={() => reloadOptions(false)}
                    >
                      Actualizar opciones
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <button
              type="submit"
              className={styles.primaryAction}
              disabled={saving || items.length === 0}
            >
              {saving ? 'Procesando…' : 'Confirmar pedido'}
            </button>
          </aside>
        </form>
      ) : null}
    </div>
  )
}

interface TextFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: string
  required?: boolean
  autoComplete?: string
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  required = false,
  autoComplete,
}: TextFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        {label}
        {required ? ' *' : ''}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <p id={`${id}-error`} className={styles.fieldError}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
