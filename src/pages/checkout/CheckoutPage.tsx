import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import * as checkoutApi from '@/api/checkoutApi'
import { createStorefrontOrder, getCheckoutOptions } from '@/api/checkoutApi'
import { isApiError, normalizeApiError } from '@/api/errors'
import { PriceTag } from '@/features/catalog/components/PriceTag'
import type {
  CheckoutOptions,
  CreateStorefrontOrderInput,
  EcuadorCanton,
  EcuadorProvince,
  StorefrontCheckoutQuote,
  StorefrontOrderResult,
  StorefrontShippingOption,
} from '@/api/types'
import { formatPrice, roundCurrency } from '@/lib/format'
import { createId } from '@/lib/id'
import { TurnstileWidget } from '@/lib/turnstile'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { clearCart, selectCartItems, selectCartItemsBelowMinQuantity, selectCartSubtotal } from '@/store/cartSlice'
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
  provinceId: string
  cantonId: string
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
  provinceId: '',
  cantonId: '',
  reference: '',
  notes: '',
}

function shippingOptionKey(opt: Pick<StorefrontShippingOption, 'code' | 'shippingMethodId'>): string {
  return `${opt.code}:${opt.shippingMethodId ?? 'static'}`
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+\d][\d\s\-()]{6,}$/

function elapsedMsSince(start: number): number {
  return start > 0 ? Date.now() - start : 0
}

const CHECKOUT_REQUEST_KEY = 'ecunexo.checkout.request.v1'

function cartSignature(items: readonly { catalogItemId: string; quantity: number }[]): string {
  return items
    .map((item) => `${item.catalogItemId}x${item.quantity}`)
    .sort()
    .join('|')
}

/**
 * Reutiliza el requestId del carrito actual (idempotencia): un refresco o reintento
 * tras un fallo de red devuelve el mismo pedido en lugar de crear otro.
 */
function resolveRequestId(signature: string): string {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_REQUEST_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { signature?: string; requestId?: string }
      if (parsed.signature === signature && parsed.requestId) {
        return parsed.requestId
      }
    }
  } catch { /* ignore */ }

  const requestId = createId()
  try {
    sessionStorage.setItem(
      CHECKOUT_REQUEST_KEY,
      JSON.stringify({ signature, requestId }),
    )
  } catch { /* ignore */ }
  return requestId
}

function clearStoredRequestId(): void {
  try {
    sessionStorage.removeItem(CHECKOUT_REQUEST_KEY)
  } catch { /* ignore */ }
}

function validateForm(
  form: CheckoutFormState,
  dynamicShippingEnabled: boolean,
): CheckoutFormErrors {
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
  if (dynamicShippingEnabled) {
    if (!form.provinceId) errors.provinceId = 'Selecciona tu provincia.'
    if (!form.cantonId) errors.cantonId = 'Selecciona tu cantón.'
  } else if (!form.city.trim()) {
    errors.city = 'Ingresa tu ciudad.'
  }

  return errors
}

export function CheckoutPage() {
  const tenantId = useAppSelector(selectStorefrontTenantId)
  const storeName = useAppSelector(selectStorefrontName)
  const items = useAppSelector(selectCartItems)
  const belowMinItems = useAppSelector(selectCartItemsBelowMinQuantity)
  const subtotal = useAppSelector(selectCartSubtotal)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const [options, setOptions] = useState<CheckoutOptions | null>(null)
  const [optionsStatus, setOptionsStatus] = useState<OptionsStatus>('loading')
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [optionsReloadKey, setOptionsReloadKey] = useState(0)
  const [form, setForm] = useState<CheckoutFormState>(EMPTY_FORM)
  const [contactFax, setContactFax] = useState('')
  const startedAtRef = useRef(0)

  useEffect(() => {
    startedAtRef.current = Date.now()
  }, [])
  const [errors, setErrors] = useState<CheckoutFormErrors>({})
  const [paymentChoice, setPaymentChoice] = useState('')
  const [shippingChoice, setShippingChoice] = useState('')
  const [saving, setSaving] = useState(false)
  const [placed, setPlaced] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [privacyError, setPrivacyError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [stockConflict, setStockConflict] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0)
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [quote, setQuote] = useState<StorefrontCheckoutQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [provinces, setProvinces] = useState<EcuadorProvince[]>([])
  const [provincesLoading, setProvincesLoading] = useState(false)
  const [cantons, setCantons] = useState<EcuadorCanton[]>([])
  const [cantonsLoading, setCantonsLoading] = useState(false)
  const [dynamicShippingOptions, setDynamicShippingOptions] = useState<StorefrontShippingOption[]>([])
  const [dynamicShippingLoading, setDynamicShippingLoading] = useState(false)
  const [dynamicShippingError, setDynamicShippingError] = useState<string | null>(null)
  const [couponFeedback, setCouponFeedback] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)
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

  const dynamicShippingEnabled = Boolean(options?.dynamicShippingEnabled)

  useEffect(() => {
    if (!dynamicShippingEnabled) return
    if (typeof checkoutApi.listEcuadorProvinces !== 'function') return
    const controller = new AbortController()

    Promise.resolve()
      .then(() => {
        if (!controller.signal.aborted) setProvincesLoading(true)
        return checkoutApi.listEcuadorProvinces(controller.signal)
      })
      .then((data) => {
        if (!controller.signal.aborted) setProvinces(data)
      })
      .catch(() => {
        // Silencioso; el select queda disponible para reintento si es necesario.
      })
      .finally(() => {
        if (!controller.signal.aborted) setProvincesLoading(false)
      })

    return () => controller.abort()
  }, [dynamicShippingEnabled])

  useEffect(() => {
    if (!dynamicShippingEnabled || !form.provinceId) return
    if (typeof checkoutApi.listEcuadorCantons !== 'function') return
    const controller = new AbortController()

    Promise.resolve()
      .then(() => {
        if (!controller.signal.aborted) setCantonsLoading(true)
        return checkoutApi.listEcuadorCantons(form.provinceId, controller.signal)
      })
      .then((data) => {
        if (!controller.signal.aborted) setCantons(data)
      })
      .catch(() => {
        if (!controller.signal.aborted) setCantons([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setCantonsLoading(false)
      })

    return () => controller.abort()
  }, [dynamicShippingEnabled, form.provinceId])

  const itemsSubtotalForShipping = quote
    ? roundCurrency(quote.subtotal + quote.taxAmount)
    : subtotal

  useEffect(() => {
    if (!dynamicShippingEnabled || !tenantId || !form.cantonId) return
    if (typeof checkoutApi.listStorefrontShippingOptions !== 'function') return
    const controller = new AbortController()

    Promise.resolve()
      .then(() => {
        if (!controller.signal.aborted) {
          setDynamicShippingLoading(true)
          setDynamicShippingError(null)
        }
        return checkoutApi.listStorefrontShippingOptions(
          tenantId,
          form.cantonId,
          itemsSubtotalForShipping,
          controller.signal,
        )
      })
      .then((data) => {
        if (!controller.signal.aborted) setDynamicShippingOptions(data)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setDynamicShippingOptions([])
        setDynamicShippingError(normalizeApiError(error).message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setDynamicShippingLoading(false)
      })

    return () => controller.abort()
  }, [dynamicShippingEnabled, tenantId, form.cantonId, itemsSubtotalForShipping])

  const paymentMethod = options?.paymentMethods.some(
    (method) => method.code === paymentChoice,
  )
    ? paymentChoice
    : (options?.paymentMethods[0]?.code ?? '')

  const selectedDynamicShipping = dynamicShippingEnabled
    ? (dynamicShippingOptions.find(
        (opt) => shippingOptionKey(opt) === shippingChoice,
      ) ?? dynamicShippingOptions[0] ?? null)
    : null

  const staticShippingMethod = options?.shippingMethods.some(
    (method) => method.code === shippingChoice,
  )
    ? shippingChoice
    : (options?.shippingMethods[0]?.code ?? '')

  const shippingMethod = dynamicShippingEnabled
    ? (selectedDynamicShipping?.code ?? '')
    : staticShippingMethod
  const shippingMethodId = dynamicShippingEnabled
    ? (selectedDynamicShipping?.shippingMethodId ?? null)
    : null

  const selectedPayment =
    options?.paymentMethods.find((method) => method.code === paymentMethod) ?? null
  const selectedShipping = dynamicShippingEnabled
    ? selectedDynamicShipping
    : (options?.shippingMethods.find((method) => method.code === staticShippingMethod) ?? null)
  const shippingCost = selectedShipping?.cost ?? 0

  const selectedProvince = provinces.find((p) => p.id === form.provinceId) ?? null
  const selectedCanton = cantons.find((c) => c.id === form.cantonId) ?? null

  useEffect(() => {
    if (!tenantId || items.length === 0) return
    if (typeof checkoutApi.calculateStorefrontQuote !== 'function') return

    const controller = new AbortController()
    const quotePromise = checkoutApi.calculateStorefrontQuote(
      tenantId,
      {
        items: items.map((item) => ({
          catalogItemId: item.catalogItemId,
          quantity: item.quantity,
        })),
        shippingMethod: shippingMethod || null,
        couponCode: appliedCoupon,
        ...(dynamicShippingEnabled && form.cantonId
          ? {
              cantonId: form.cantonId,
              shippingMethodId,
            }
          : {}),
      },
      controller.signal,
    )

    if (!quotePromise || typeof quotePromise.then !== 'function') {
      return () => controller.abort()
    }

    Promise.resolve()
      .then(() => {
        if (!controller.signal.aborted) setQuoteLoading(true)
        return quotePromise
      })
      .then((data) => {
        if (controller.signal.aborted || !data) return
        setQuote(data)
        setQuoteError(null)
        if (appliedCoupon) {
          if (data.couponApplied) {
            setCouponFeedback({
              tone: 'success',
              message: data.couponMessage ?? `Código ${data.couponCode ?? appliedCoupon} aplicado.`,
            })
          } else {
            setCouponFeedback({
              tone: 'error',
              message: data.couponMessage ?? 'El código promocional no es válido.',
            })
            setAppliedCoupon(null)
          }
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const msg = isApiError(err)
          ? err.message
          : err instanceof Error
            ? err.message
            : null
        setQuoteError(msg)
      })
      .finally(() => {
        if (!controller.signal.aborted) setQuoteLoading(false)
      })

    return () => controller.abort()
  }, [tenantId, items, shippingMethod, shippingMethodId, form.cantonId, dynamicShippingEnabled, appliedCoupon])

  if (items.length === 0 && !placed) {
    return <Navigate to="/" replace />
  }

  const localGrossSubtotal = roundCurrency(
    items.reduce(
      (acc, item) => acc + (item.originalPrice ?? item.price) * item.quantity,
      0,
    ),
  )
  const localAutoDiscount = Math.max(0, roundCurrency(localGrossSubtotal - subtotal))
  const grossSubtotal = quote ? quote.grossSubtotal : localGrossSubtotal
  const promotionDiscount = quote ? quote.promotionDiscountAmount : localAutoDiscount
  const couponDiscount = quote ? quote.couponDiscountAmount : 0
  const taxRate = quote?.taxRate ?? options?.taxRate ?? 0.15
  const taxPercentLabel = Math.round(taxRate * 100)
  const netItemsWithTax = quote
    ? roundCurrency(quote.subtotal + quote.taxAmount)
    : subtotal
  const subtotalExTax = quote
    ? quote.subtotal
    : roundCurrency(netItemsWithTax / (1 + taxRate))
  const taxAmount = quote
    ? quote.taxAmount
    : roundCurrency(netItemsWithTax - subtotalExTax)
  const total = roundCurrency(subtotalExTax + taxAmount + shippingCost)
  const minOrderAmount = options?.minOrderAmount ?? 0
  const belowMinAmount = minOrderAmount > 0 && netItemsWithTax < minOrderAmount
  const meetsMinimum = belowMinItems.length === 0 && !belowMinAmount

  const handleApplyCoupon = () => {
    const clean = couponInput.trim().toUpperCase()
    if (!clean) {
      setCouponFeedback({ tone: 'error', message: 'Ingresa un código promocional.' })
      return
    }
    setCouponFeedback(null)
    setAppliedCoupon(clean)
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponFeedback(null)
  }

  const updateField =
    (field: keyof CheckoutFormState) => (value: string) => {
      setForm((current) => ({ ...current, [field]: value }))
      setErrors((current) => ({ ...current, [field]: undefined }))
    }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    setSubmitError(null)
    setStockConflict(false)

    if (!tenantId || !options || items.length === 0) return

    if (belowMinItems.length > 0) {
      setSubmitError('Hay productos por debajo de su compra mínima.')
      return
    }

    if (belowMinAmount) {
      setSubmitError(`El pedido mínimo es ${formatPrice(minOrderAmount)}.`)
      return
    }

    const validationErrors = validateForm(form, dynamicShippingEnabled)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    if (!paymentMethod || !shippingMethod) {
      setSubmitError(
        dynamicShippingEnabled
          ? 'Selecciona un método de envío disponible para tu cantón.'
          : 'Selecciona un método de pago y uno de envío.',
      )
      return
    }

    if (!privacyAccepted) {
      setPrivacyError('Debes aceptar la política de tratamiento de datos personales.')
      return
    }

    const orderItems = items.map((item) => ({
      catalogItemId: item.catalogItemId,
      quantity: item.quantity,
    }))
    requestIdRef.current = resolveRequestId(cartSignature(orderItems))

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
        city: dynamicShippingEnabled
          ? (selectedCanton?.name ?? form.city.trim())
          : form.city.trim(),
        reference: form.reference.trim() ? form.reference.trim() : null,
        ...(dynamicShippingEnabled
          ? {
              province: selectedProvince?.name ?? null,
              provinceId: form.provinceId || null,
              cantonId: form.cantonId || null,
            }
          : {}),
      },
      paymentMethod,
      shippingMethod,
      ...(dynamicShippingEnabled ? { shippingMethodId } : {}),
      items: orderItems,
      notes: form.notes.trim() ? form.notes.trim() : null,
      contactFax: contactFax.trim() ? contactFax : null,
      formElapsedMs: elapsedMsSince(startedAtRef.current),
      turnstileToken: turnstileToken ?? null,
      acceptPrivacyPolicy: true,
      couponCode: quote?.couponApplied ? (quote.couponCode ?? appliedCoupon) : appliedCoupon,
    }

    setSaving(true)
    try {
      const result: StorefrontOrderResult = await createStorefrontOrder(tenantId, input)
      clearStoredRequestId()
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
      if (apiError.code === 'ecommerce.checkout.captcha_failed') {
        setTurnstileToken(null)
        setTurnstileResetSignal((value) => value + 1)
        setSubmitError(apiError.message)
      } else if (
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
            name="contactFax"
            className={styles.honeypot}
            value={contactFax}
            onChange={(event) => setContactFax(event.target.value)}
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
              {dynamicShippingEnabled ? (
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label htmlFor="checkout-province">Provincia *</label>
                    <select
                      id="checkout-province"
                      value={form.provinceId}
                      required
                      disabled={provincesLoading}
                      aria-invalid={errors.provinceId ? true : undefined}
                      aria-describedby={errors.provinceId ? 'checkout-province-error' : undefined}
                      onChange={(event) => {
                        const nextProvinceId = event.target.value
                        setForm((current) => ({
                          ...current,
                          provinceId: nextProvinceId,
                          cantonId: '',
                          city: '',
                        }))
                        setCantons([])
                        setDynamicShippingOptions([])
                        setDynamicShippingError(null)
                        setShippingChoice('')
                        setErrors((current) => ({
                          ...current,
                          provinceId: undefined,
                          cantonId: undefined,
                        }))
                      }}
                    >
                      <option value="">
                        {provincesLoading ? 'Cargando provincias…' : 'Selecciona una provincia'}
                      </option>
                      {provinces.map((province) => (
                        <option key={province.id} value={province.id}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                    {errors.provinceId ? (
                      <p id="checkout-province-error" className={styles.fieldError}>
                        {errors.provinceId}
                      </p>
                    ) : null}
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="checkout-canton">Cantón *</label>
                    <select
                      id="checkout-canton"
                      value={form.cantonId}
                      required
                      disabled={!form.provinceId || cantonsLoading}
                      aria-invalid={errors.cantonId ? true : undefined}
                      aria-describedby={errors.cantonId ? 'checkout-canton-error' : undefined}
                      onChange={(event) => {
                        const nextCantonId = event.target.value
                        const canton = cantons.find((c) => c.id === nextCantonId)
                        setForm((current) => ({
                          ...current,
                          cantonId: nextCantonId,
                          city: canton?.name ?? '',
                        }))
                        if (!nextCantonId) {
                          setDynamicShippingOptions([])
                          setDynamicShippingError(null)
                        }
                        setShippingChoice('')
                        setErrors((current) => ({
                          ...current,
                          cantonId: undefined,
                          city: undefined,
                        }))
                      }}
                    >
                      <option value="">
                        {!form.provinceId
                          ? 'Elige primero una provincia'
                          : cantonsLoading
                            ? 'Cargando cantones…'
                            : 'Selecciona un cantón'}
                      </option>
                      {cantons.map((canton) => (
                        <option key={canton.id} value={canton.id}>
                          {canton.name}
                        </option>
                      ))}
                    </select>
                    {errors.cantonId ? (
                      <p id="checkout-canton-error" className={styles.fieldError}>
                        {errors.cantonId}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <TextField
                  id="checkout-city"
                  label="Ciudad"
                  value={form.city}
                  error={errors.city}
                  required
                  autoComplete="address-level2"
                  onChange={updateField('city')}
                />
              )}
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
              {dynamicShippingEnabled ? (
                !form.cantonId ? (
                  <p className={styles.shippingNotice}>
                    Selecciona tu provincia y cantón para ver los transportistas y tarifas de envío disponibles.
                  </p>
                ) : dynamicShippingLoading ? (
                  <p className={styles.shippingNotice} role="status">
                    Calculando tarifas de envío para {selectedCanton?.name ?? 'tu cantón'}…
                  </p>
                ) : dynamicShippingError ? (
                  <p className={styles.shippingNotice} role="alert">
                    {dynamicShippingError}
                  </p>
                ) : dynamicShippingOptions.length === 0 ? (
                  <p className={styles.shippingNotice}>
                    Por el momento no tenemos cobertura de envío configurada para{' '}
                    <strong>{selectedCanton?.name ?? 'este cantón'}</strong>. Elige otro cantón o contáctanos por WhatsApp.
                  </p>
                ) : (
                  <div className={styles.optionList}>
                    {dynamicShippingOptions.map((method) => {
                      const key = shippingOptionKey(method)
                      const isChecked =
                        selectedDynamicShipping !== null &&
                        shippingOptionKey(selectedDynamicShipping) === key
                      return (
                        <label key={key} className={styles.option}>
                          <input
                            type="radio"
                            name="shippingMethod"
                            value={key}
                            checked={isChecked}
                            onChange={() => setShippingChoice(key)}
                          />
                          <span className={styles.optionBody}>
                            <span className={styles.optionHeader}>
                              <span className={styles.optionLabel}>{method.label}</span>
                              <span className={styles.optionCost}>
                                {method.cost > 0 ? formatPrice(method.cost) : 'Gratis'}
                              </span>
                            </span>
                            {method.description ? (
                              <span className={styles.optionHint}>{method.description}</span>
                            ) : null}
                            {method.estimatedDays ||
                            (!method.isFreeShipping && method.freeShippingMinAmount) ? (
                              <span className={styles.optionMeta}>
                                {[
                                  method.estimatedDays ? `Entrega estimada: ${method.estimatedDays}` : null,
                                  !method.isFreeShipping && method.freeShippingMinAmount
                                    ? `Gratis desde ${formatPrice(method.freeShippingMinAmount)}`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )
              ) : (
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
              )}
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
              {items.map((item) => {
                const quoteLine = quote?.items.find(
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
                  <li key={item.catalogItemId} className={styles.summaryItem}>
                    <span className={styles.summaryItemName}>
                      {item.name} × {item.quantity}
                    </span>
                    <PriceTag
                      size="sm"
                      price={linePrice}
                      originalPrice={lineOriginal}
                      discountPercent={lineDiscountPercent}
                    />
                  </li>
                )
              })}
            </ul>

            <div className={styles.couponBox}>
              <label htmlFor="checkout-coupon" className={styles.couponLabel}>
                Código promocional
              </label>
              {quote?.couponApplied && appliedCoupon ? (
                <div className={styles.couponActive}>
                  <span className={styles.couponBadge}>
                    Cupón <strong>{quote.couponCode ?? appliedCoupon}</strong>
                  </span>
                  <button
                    type="button"
                    className={styles.couponRemove}
                    onClick={handleRemoveCoupon}
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <div className={styles.couponRow}>
                  <input
                    id="checkout-coupon"
                    type="text"
                    className={styles.couponInput}
                    placeholder="Ej. BIENVENIDA10"
                    value={couponInput}
                    disabled={quoteLoading || saving}
                    onChange={(event) => {
                      setCouponInput(event.target.value.toUpperCase())
                      if (couponFeedback) setCouponFeedback(null)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        handleApplyCoupon()
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={styles.couponButton}
                    disabled={quoteLoading || saving || !couponInput.trim()}
                    onClick={handleApplyCoupon}
                  >
                    {quoteLoading ? '...' : 'Aplicar'}
                  </button>
                </div>
              )}
              {couponFeedback ? (
                <p
                  className={
                    couponFeedback.tone === 'success'
                      ? styles.couponSuccess
                      : styles.couponError
                  }
                >
                  {couponFeedback.message}
                </p>
              ) : null}
            </div>

            <dl className={styles.totals}>
              {promotionDiscount > 0 || couponDiscount > 0 ? (
                <div className={styles.totalRow}>
                  <dt>Subtotal productos</dt>
                  <dd>{formatPrice(grossSubtotal)}</dd>
                </div>
              ) : null}
              {promotionDiscount > 0 ? (
                <div className={`${styles.totalRow} ${styles.discountRow}`}>
                  <dt>Descuento promocional</dt>
                  <dd>-{formatPrice(promotionDiscount)}</dd>
                </div>
              ) : null}
              {couponDiscount > 0 ? (
                <div className={`${styles.totalRow} ${styles.discountRow}`}>
                  <dt>Cupón ({quote?.couponCode ?? appliedCoupon})</dt>
                  <dd>-{formatPrice(couponDiscount)}</dd>
                </div>
              ) : null}
              <div className={styles.totalRow}>
                <dt>Subtotal (sin IVA)</dt>
                <dd>{formatPrice(subtotalExTax)}</dd>
              </div>
              <div className={styles.totalRow}>
                <dt>IVA ({taxPercentLabel}% incluido)</dt>
                <dd>{formatPrice(taxAmount)}</dd>
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

            {options.turnstileSiteKey ? (
              <div className={styles.turnstile}>
                <TurnstileWidget
                  siteKey={options.turnstileSiteKey}
                  onToken={setTurnstileToken}
                  resetSignal={turnstileResetSignal}
                />
              </div>
            ) : null}

            <div className={styles.consent}>
              <label className={styles.consentLabel}>
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  aria-invalid={privacyError ? true : undefined}
                  aria-describedby={privacyError ? 'checkout-privacy-error' : undefined}
                  onChange={(event) => {
                    setPrivacyAccepted(event.target.checked)
                    if (event.target.checked) setPrivacyError(null)
                  }}
                />
                <span>
                  Acepto la{' '}
                  <Link to="/privacidad" target="_blank" rel="noreferrer">
                    política de tratamiento de datos personales
                  </Link>
                </span>
              </label>
              {privacyError ? (
                <p id="checkout-privacy-error" className={styles.fieldError} role="alert">
                  {privacyError}
                </p>
              ) : null}
            </div>

            {!meetsMinimum || quoteError ? (
              <div className={styles.alert} role="alert">
                {belowMinItems.length > 0 ? (
                  <p>Hay productos por debajo de su compra mínima.</p>
                ) : null}
                {belowMinAmount ? (
                  <p>El pedido mínimo es {formatPrice(minOrderAmount)}.</p>
                ) : null}
                {quoteError ? <p>{quoteError}</p> : null}
              </div>
            ) : null}

            <button
              type="submit"
              className={styles.primaryAction}
              disabled={saving || items.length === 0 || !meetsMinimum || Boolean(quoteError)}
            >
              {saving ? 'Procesando…' : 'Confirmar pedido'}
            </button>
          </aside>
        </form>
      ) : null}

      {saving ? (
        <div className={styles.overlay} role="alert" aria-live="assertive">
          <div className={styles.overlayCard}>
            <span className={styles.spinner} aria-hidden="true" />
            <p className={styles.overlayTitle}>Procesando tu pedido…</p>
            <p className={styles.overlayHint}>No cierres ni recargues esta página.</p>
          </div>
        </div>
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
