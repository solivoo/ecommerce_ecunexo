import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { StorefrontProductDetail } from '@/api/types'
import { PriceTag } from '@/features/catalog/components/PriceTag'
import { ProductGallery } from '@/features/catalog/components/ProductGallery'
import { VariantSelector } from '@/features/catalog/components/VariantSelector'
import { LikeButton } from '@/features/likes/LikeButton'
import { resolveColorName } from '@/features/catalog/utils/colorSwatch'
import {
  findVariant,
  initialSelection,
  isHexColor,
  type VariantSelection,
} from '@/features/catalog/utils/variantSelection'
import { formatQuantity } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { CART_MAX_QUANTITY, addItem } from '@/store/cartSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectStorefrontName } from '@/store/storefrontSlice'
import { openCartDrawer } from '@/store/uiSlice'
import {
  clearProduct,
  fetchProduct,
  selectProduct,
  selectProductError,
  selectProductStatus,
} from '@/store/productSlice'
import styles from './ProductDetailPage.module.css'

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>()
  const dispatch = useAppDispatch()
  const product = useAppSelector(selectProduct)
  const status = useAppSelector(selectProductStatus)
  const error = useAppSelector(selectProductError)
  const storeName = useAppSelector(selectStorefrontName)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!productId) return
    const request = dispatch(fetchProduct(productId))
    return () => {
      request.abort()
    }
  }, [dispatch, productId, reloadKey])

  useEffect(
    () => () => {
      dispatch(clearProduct())
    },
    [dispatch],
  )

  useDocumentTitle(product ? `${product.name} · ${storeName}` : null)

  const isLoading = status === 'loading' || status === 'idle'

  if (isLoading && !product) {
    return (
      <div className={styles.page}>
        <ProductDetailSkeleton />
      </div>
    )
  }

  if (status === 'failed' || !product) {
    return (
      <div className={styles.page}>
        <div className={styles.state}>
          <h1 className={styles.stateTitle}>Producto no disponible</h1>
          <p className={styles.stateText}>{error ?? 'No encontramos este producto.'}</p>
          <div className={styles.stateActions}>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Reintentar
            </button>
            <Link to="/" className={styles.secondaryAction}>
              Volver al catálogo
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <ProductDetailContent product={product} />
    </div>
  )
}

function ProductDetailContent({ product }: { product: StorefrontProductDetail }) {
  const axes = useMemo(() => product.matrix?.axes ?? [], [product.matrix])
  const [selection, setSelection] = useState<VariantSelection>(() =>
    initialSelection(product.variants, axes),
  )

  const selectedVariant = useMemo(
    () => findVariant(product.variants, axes, selection),
    [product.variants, axes, selection],
  )

  const images = selectedVariant?.images?.length ? selectedVariant.images : product.images
  const isAvailable = selectedVariant ? selectedVariant.inStock : product.inStock
  const quantityAvailable = selectedVariant
    ? selectedVariant.availableQuantity
    : product.availableQuantity
  const price = selectedVariant?.price ?? product.price
  const originalPrice = selectedVariant
    ? selectedVariant.originalPrice ?? null
    : product.originalPrice ?? null
  const discountPercent = selectedVariant
    ? selectedVariant.discountPercent ?? null
    : product.discountPercent ?? null
  const displaySku = selectedVariant?.sku ?? product.sku
  const maxQuantity = Math.min(
    CART_MAX_QUANTITY,
    Math.max(0, Math.floor(quantityAvailable)),
  )
  const productMinQuantity = Math.max(1, Math.trunc(product.minOrderQuantity ?? 1))
  const minQuantity = selectedVariant
    ? Math.max(1, Math.trunc(selectedVariant.minOrderQuantity ?? productMinQuantity))
    : productMinQuantity
  const requiresVariantSelection = axes.length > 0 && selectedVariant === null

  const handleAxisChange = useCallback(
    (axisName: string, value: string) => {
      setSelection((current) => {
        const next = { ...current, [axisName]: value }
        if (findVariant(product.variants, axes, next)) {
          return next
        }

        const fallback = product.variants.find(
          (variant) => (variant.dimensions?.[axisName] ?? '') === value,
        )
        return fallback?.dimensions ? { ...fallback.dimensions } : next
      })
    },
    [product.variants, axes],
  )

  return (
    <>
      <nav aria-label="Ruta de navegación" className={styles.breadcrumb}>
        <Link to="/">Catálogo</Link>
        <span aria-hidden="true">›</span>
        <span className={styles.current}>{product.name}</span>
      </nav>

      <div className={styles.layout}>
        <div className={styles.galleryColumn}>
          <ProductGallery
            key={selectedVariant?.id ?? 'model'}
            images={images}
            productName={product.name}
          />
        </div>

        <div className={styles.info}>
          <h1 className={styles.title}>{product.name}</h1>

          <div className={styles.priceRow}>
            <PriceTag
              size="lg"
              price={price}
              originalPrice={originalPrice}
              discountPercent={discountPercent}
            />
            {isAvailable ? (
              <span className={styles.stockOk}>
                {quantityAvailable > 0
                  ? `${formatQuantity(quantityAvailable)} disponibles`
                  : 'Disponible'}
              </span>
            ) : (
              <span className={styles.stockOut}>Agotado</span>
            )}
            <LikeButton productId={product.id} likeCount={product.likeCount} />
          </div>

          {displaySku ? <p className={styles.sku}>SKU: {displaySku}</p> : null}

          {selectedVariant?.extraColors?.length ? (
            <div className={styles.extraColors}>
              <span className={styles.extraColorsLabel}>Colores secundarios</span>
              <span className={styles.dots}>
                {selectedVariant.extraColors.map((color) => (
                  <span
                    key={color}
                    className={styles.dot}
                    style={isHexColor(color) ? { backgroundColor: color } : undefined}
                    title={color}
                  />
                ))}
              </span>
            </div>
          ) : null}

          {axes.length > 0 ? (
            <VariantSelector
              axes={axes}
              variants={product.variants}
              selection={selection}
              onChange={handleAxisChange}
            />
          ) : null}

          <AddToCartPanel
            key={selectedVariant?.id ?? product.id}
            catalogItemId={selectedVariant?.id ?? product.id}
            productName={product.name}
            sku={displaySku}
            price={price}
            originalPrice={originalPrice}
            discountPercent={discountPercent}
            thumbUrl={
              selectedVariant?.mainImageThumbUrl ?? product.images[0]?.thumbUrl ?? null
            }
            isAvailable={isAvailable}
            maxQuantity={maxQuantity}
            minQuantity={minQuantity}
            requiresVariantSelection={requiresVariantSelection}
          />

          {product.description ? (
            <p className={styles.description}>{product.description}</p>
          ) : null}

          {product.attributes.length > 0 ? (
            <section className={styles.specs}>
              <h2 className={styles.sectionTitle}>Especificaciones</h2>
              <dl className={styles.specList}>
                {product.attributes.map((attribute) => (
                  <div
                    key={`${attribute.level}-${attribute.name}`}
                    className={styles.specRow}
                  >
                    <dt>{attribute.name}</dt>
                    <dd>
                      <AttributeValue value={attribute.value} />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>
      </div>
    </>
  )
}

interface AddToCartPanelProps {
  catalogItemId: string
  productName: string
  sku: string | null
  price: number | null
  originalPrice: number | null
  discountPercent: number | null
  thumbUrl: string | null
  isAvailable: boolean
  maxQuantity: number
  minQuantity: number
  requiresVariantSelection: boolean
}

function AddToCartPanel({
  catalogItemId,
  productName,
  sku,
  price,
  originalPrice,
  discountPercent,
  thumbUrl,
  isAvailable,
  maxQuantity,
  minQuantity,
  requiresVariantSelection,
}: AddToCartPanelProps) {
  const dispatch = useAppDispatch()
  const [quantity, setQuantity] = useState(minQuantity)
  const [addedName, setAddedName] = useState<string | null>(null)
  const stockMeetsMinimum = maxQuantity >= minQuantity
  const canAdd = isAvailable && maxQuantity > 0 && price !== null && stockMeetsMinimum

  const handleQuantityChange = (value: string) => {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isFinite(parsed)) {
      setQuantity(minQuantity)
      return
    }
    setQuantity(Math.min(maxQuantity, Math.max(minQuantity, parsed)))
  }

  const handleAdd = () => {
    if (!canAdd || price === null) return

    dispatch(
      addItem({
        catalogItemId,
        name: productName,
        sku,
        price,
        originalPrice,
        discountPercent,
        quantity,
        thumbUrl,
        minOrderQuantity: minQuantity,
      }),
    )
    setAddedName(productName)
  }

  return (
    <div className={styles.purchase}>
      <div className={styles.quantityField}>
        <label className={styles.quantityLabel} htmlFor="product-quantity">
          Cantidad
        </label>
        <div className={styles.quantity}>
          <button
            type="button"
            aria-label="Disminuir cantidad"
            disabled={!canAdd || quantity <= minQuantity}
            onClick={() => setQuantity((current) => Math.max(minQuantity, current - 1))}
          >
            −
          </button>
          <input
            id="product-quantity"
            className={styles.quantityInput}
            type="number"
            inputMode="numeric"
            min={minQuantity}
            max={Math.max(minQuantity, maxQuantity)}
            value={quantity}
            disabled={!canAdd}
            onChange={(event) => handleQuantityChange(event.target.value)}
          />
          <button
            type="button"
            aria-label="Aumentar cantidad"
            disabled={!canAdd || quantity >= maxQuantity}
            onClick={() =>
              setQuantity((current) => Math.min(maxQuantity, current + 1))
            }
          >
            +
          </button>
        </div>
        {minQuantity > 1 ? (
          <p className={styles.minQuantityHint}>Mínimo {minQuantity}</p>
        ) : null}
      </div>
      <button
        type="button"
        className={styles.addToCart}
        disabled={!canAdd}
        onClick={handleAdd}
      >
        Agregar al carrito
      </button>
      {!canAdd ? (
        <p className={styles.addHint}>
          {!isAvailable || maxQuantity === 0
            ? 'No hay stock disponible para esta opción.'
            : !stockMeetsMinimum
              ? `No hay stock suficiente para el mínimo de ${minQuantity}.`
              : price === null
                ? 'El precio no está disponible por ahora.'
                : requiresVariantSelection
                  ? 'Elige una opción para continuar.'
                  : 'No disponible.'}
        </p>
      ) : null}
      {addedName ? (
        <p className={styles.addNotice} role="status">
          {addedName} se agregó al carrito.{' '}
          <button
            type="button"
            className={styles.addNoticeLink}
            onClick={() => dispatch(openCartDrawer())}
          >
            Ver carrito
          </button>
        </p>
      ) : null}
    </div>
  )
}

function AttributeValue({ value }: { value: string }) {
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0 || !parts.every(isHexColor)) {
    return <>{value}</>
  }

  return (
    <span className={styles.colorValues}>
      {parts.map((part) => (
        <span key={part} className={styles.colorValue}>
          <span
            className={styles.dot}
            style={{ backgroundColor: part }}
            aria-hidden="true"
          />
          {resolveColorName(part) ?? part}
        </span>
      ))}
    </span>
  )
}

function ProductDetailSkeleton() {
  return (
    <div className={styles.skeletonLayout} aria-hidden="true">
      <div className={styles.skeletonStage} />
      <div className={styles.skeletonInfo}>
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLineShort} />
        <div className={styles.skeletonLine} />
      </div>
    </div>
  )
}
