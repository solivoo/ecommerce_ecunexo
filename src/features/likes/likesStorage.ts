export const LIKES_STORAGE_KEY = 'ecunexo.likes.v1'

function readRaw(): string[] {
  try {
    const raw = window.localStorage.getItem(LIKES_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return []
  }
}

function write(ids: Set<string>): void {
  try {
    window.localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    // Sin persistencia disponible (modo privado): el like sigue funcionando en memoria.
  }
}

export function readLikedProductIds(): Set<string> {
  return new Set(readRaw())
}

export function isProductLiked(productId: string): boolean {
  return readLikedProductIds().has(productId)
}

/** Persiste o quita el producto del set local de gustados. */
export function persistProductLike(productId: string, liked: boolean): void {
  const ids = readLikedProductIds()
  if (liked) {
    ids.add(productId)
  } else {
    ids.delete(productId)
  }
  write(ids)
}
