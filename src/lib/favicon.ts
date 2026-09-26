const ICON_SELECTOR = 'link[rel="icon"], link[rel="shortcut icon"]'

function getIconLink(): HTMLLinkElement {
  const existing = document.querySelector<HTMLLinkElement>(ICON_SELECTOR)
  if (existing) return existing

  const link = document.createElement('link')
  link.rel = 'icon'
  document.head.append(link)
  return link
}

export function setFavicon(href: string): void {
  const link = getIconLink()
  link.removeAttribute('type')
  link.href = href
}

export function letterFavicon(name: string, color: string | null): string {
  const letter = (name.trim().charAt(0) || '?').toUpperCase().replace(/[&<>"']/g, '')
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
    `<rect width="64" height="64" rx="14" fill="${color ?? '#1f2937'}"/>`,
    `<text x="32" y="44" font-family="system-ui, sans-serif" font-size="36" font-weight="700" fill="#fff" text-anchor="middle">${letter}</text>`,
    '</svg>',
  ].join('')

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
