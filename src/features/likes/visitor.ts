import { createId } from '@/lib/id'

export const VISITOR_STORAGE_KEY = 'ecunexo.visitor.v1'

let fallbackVisitorId: string | null = null

/** Identificador opaco y persistente del visitante anónimo (localStorage). */
export function getVisitorId(): string {
  try {
    const stored = window.localStorage.getItem(VISITOR_STORAGE_KEY)?.trim()
    if (stored) return stored

    const created = createId()
    window.localStorage.setItem(VISITOR_STORAGE_KEY, created)
    return created
  } catch {
    fallbackVisitorId ??= createId()
    return fallbackVisitorId
  }
}
