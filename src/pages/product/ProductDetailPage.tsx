import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { StorefrontProductDetail } from '@/api/types'
import { ProductGallery } from '@/features/catalog/components/ProductGallery'
import { VariantSelector } from '@/features/catalog/components/VariantSelector'
import {
  findVariant,
  initialSelection,
  isHexColor,
  type VariantSelection,
} from '@/features/catalog/utils/variantSelection'
import { formatPrice, formatQuantity } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { selectStorefrontName } from '@/store/storefrontSlice'
import {
  clearProduct,
  fetchProduct,
  selectProduct,
  selectProductError,
  selectProductStatus,
} from '@/store/productSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
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
  const quantity = selectedVariant?.availableQuantity ?? product.availableQuantity
  const price = selectedVariant?.price ?? product.price
  const displaySku = selectedVariant?.sku ?? product.sku

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
        {product.categoryName ? (
          <>
            <span aria-hidden="true">›</span>
            <Link to={product.categoryId ? `/?categoria=${product.categoryId}` : '/'}>
              {product.categoryName}
            </Link>
          </>
        ) : null}
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
          <p className={styles.category}>{product.categoryName ?? 'General'}</p>
          <h1 className={styles.title}>{product.name}</h1>

          <div className={styles.priceRow}>
            <p className={styles.price}>{formatPrice(price)}</p>
            {isAvailable ? (
              <span className={styles.stockOk}>
                {quantity > 0 ? `${formatQuantity(quantity)} disponibles` : 'Disponible'}
              </span>
            ) : (
              <span className={styles.stockOut}>Agotado</span>
            )}
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

function AttributeValue({ value }: { value: string }) {
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0 || !parts.every(isHexColor)) {
    return <>{value}</>
  }

  return (
    <span className={styles.dots}>
      {parts.map((part) => (
        <span
          key={part}
          className={styles.dot}
          style={{ backgroundColor: part }}
          title={part}
        />
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
