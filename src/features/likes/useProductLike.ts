import { useCallback, useRef, useState } from 'react'
import { likeProduct, unlikeProduct } from '@/api/catalogApi'
import { useAppSelector } from '@/store/hooks'
import { selectStorefrontTenantId } from '@/store/storefrontSlice'
import { isProductLiked, persistProductLike } from './likesStorage'
import { getVisitorId } from './visitor'

export interface ProductLikeState {
  liked: boolean
  likeCount: number
  pending: boolean
  toggle: () => void
}

/**
 * Estado optimista del "me gusta" con rollback si la API falla.
 * El set local (`localStorage`) se actualiza al instante para sobrevivir recargas.
 */
export function useProductLike(productId: string, initialLikeCount: number): ProductLikeState {
  const tenantId = useAppSelector(selectStorefrontTenantId)
  const [liked, setLiked] = useState(() => isProductLiked(productId))
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)

  const toggle = useCallback(() => {
    if (pendingRef.current) return

    pendingRef.current = true
    setPending(true)

    const previousLiked = liked
    const previousCount = likeCount
    const next = !liked

    setLiked(next)
    setLikeCount(Math.max(0, previousCount + (next ? 1 : -1)))
    persistProductLike(productId, next)

    void (async () => {
      try {
        if (!tenantId) return

        const visitorId = getVisitorId()
        const result = next
          ? await likeProduct(tenantId, productId, visitorId)
          : await unlikeProduct(tenantId, productId, visitorId)

        setLiked(result.liked)
        setLikeCount(result.likeCount)
        persistProductLike(productId, result.liked)
      } catch {
        // 429 u otro fallo: revierte sin romper el flujo (el cliente avisa el 429).
        setLiked(previousLiked)
        setLikeCount(previousCount)
        persistProductLike(productId, previousLiked)
      } finally {
        pendingRef.current = false
        setPending(false)
      }
    })()
  }, [liked, likeCount, productId, tenantId])

  return { liked, likeCount, pending, toggle }
}
