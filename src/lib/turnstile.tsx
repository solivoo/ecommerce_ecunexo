import { useEffect, useRef } from 'react'

interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  remove: (widgetId: string) => void
  reset: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const SCRIPT_MARKER = 'data-ecunexo-turnstile'

interface TurnstileWidgetProps {
  siteKey: string
  onToken: (token: string | null) => void
  /** Al incrementar, resetea el widget (p. ej. tras un fallo de captcha). */
  resetSignal?: number
}

/**
 * Widget explícito de Cloudflare Turnstile. El script se carga una sola vez y
 * el widget se renderiza dentro del contenedor cuando está disponible.
 */
export function TurnstileWidget({
  siteKey,
  onToken,
  resetSignal = 0,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)

  useEffect(() => {
    onTokenRef.current = onToken
  }, [onToken])

  useEffect(() => {
    let disposed = false
    let script: HTMLScriptElement | null = null

    const renderWidget = () => {
      if (
        disposed ||
        widgetIdRef.current ||
        !containerRef.current ||
        !window.turnstile
      ) {
        return
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onTokenRef.current(token),
        'expired-callback': () => onTokenRef.current(null),
        'error-callback': () => onTokenRef.current(null),
      })
    }

    if (window.turnstile) {
      renderWidget()
    } else {
      script =
        document.querySelector<HTMLScriptElement>(`script[${SCRIPT_MARKER}]`) ??
        null

      if (!script) {
        script = document.createElement('script')
        script.src = SCRIPT_SRC
        script.async = true
        script.defer = true
        script.setAttribute(SCRIPT_MARKER, 'true')
        document.head.appendChild(script)
      }

      script.addEventListener('load', renderWidget)
    }

    return () => {
      disposed = true
      script?.removeEventListener('load', renderWidget)

      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // El widget ya no existe.
        }
        widgetIdRef.current = null
      }
    }
  }, [siteKey])

  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current)
      } catch {
        // El widget ya no existe.
      }
      onTokenRef.current(null)
    }
  }, [resetSignal])

  return <div ref={containerRef} />
}
