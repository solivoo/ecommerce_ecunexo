import { afterEach, describe, expect, it } from 'vitest'
import { letterFavicon, setFavicon } from './favicon'

function iconLinks(): NodeListOf<HTMLLinkElement> {
  return document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')
}

describe('favicon', () => {
  afterEach(() => {
    iconLinks().forEach((link) => link.remove())
  })

  it('crea el link del icono cuando no existe', () => {
    setFavicon('/api/v1/tenants/t1/brand-logos/l1/file')

    const links = iconLinks()
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe('/api/v1/tenants/t1/brand-logos/l1/file')
  })

  it('reutiliza el link existente y limpia el type del favicon de Vite', () => {
    const existing = document.createElement('link')
    existing.rel = 'icon'
    existing.type = 'image/svg+xml'
    existing.href = '/favicon.svg'
    document.head.append(existing)

    setFavicon('https://cdn.test/logo.webp')

    const links = iconLinks()
    expect(links).toHaveLength(1)
    expect(existing.getAttribute('href')).toBe('https://cdn.test/logo.webp')
    expect(existing.hasAttribute('type')).toBe(false)
  })

  it('genera un icono de letra con el color del tenant', () => {
    const href = letterFavicon('Everchic', '#e0b120')

    expect(href.startsWith('data:image/svg+xml,')).toBe(true)
    const svg = decodeURIComponent(href.replace('data:image/svg+xml,', ''))
    expect(svg).toContain('>E<')
    expect(svg).toContain('#e0b120')
  })

  it('usa el color por defecto cuando el tenant no define uno', () => {
    const href = letterFavicon('', null)
    const svg = decodeURIComponent(href.replace('data:image/svg+xml,', ''))

    expect(svg).toContain('#1f2937')
    expect(svg).toContain('>?<')
  })
})
