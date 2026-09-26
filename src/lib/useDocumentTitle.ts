import { useEffect } from 'react'
import { DEFAULT_DOCUMENT_TITLE } from './store'

export function useDocumentTitle(title: string | null | undefined): void {
  useEffect(() => {
    if (!title) return
    document.title = title
    return () => {
      document.title = DEFAULT_DOCUMENT_TITLE
    }
  }, [title])
}
