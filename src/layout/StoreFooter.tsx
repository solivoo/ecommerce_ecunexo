import { Link } from 'react-router-dom'
import type { StorefrontSocialLinks } from '@/api/types'
import { STORE_NAME } from '@/lib/store'
import { useAppSelector } from '@/store/hooks'
import { selectStorefrontSocialLinks } from '@/store/storefrontStatusSlice'
import { selectStorefrontConfig } from '@/store/storefrontSlice'
import styles from './StoreFooter.module.css'

const ECUNEXO_URL = 'https://www.ecunexo.com'

const SOCIAL_LINKS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'tiktok', label: 'TikTok' },
] as const

function socialHref(links: StorefrontSocialLinks | null | undefined, key: (typeof SOCIAL_LINKS)[number]['key']) {
  const value = links?.[key]?.trim()
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

function SocialIcon({ name }: { name: (typeof SOCIAL_LINKS)[number]['key'] }) {
  if (name === 'instagram') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (name === 'facebook') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14.5 3c.4 2.4 1.8 4 4 4.2v2.6c-1.4 0-2.7-.4-3.8-1.1v6.6c0 3.2-2.6 5.7-5.8 5.7S3.1 18.5 3.1 15.3 5.7 9.6 8.9 9.6c.3 0 .7 0 1 .1v2.8a3 3 0 0 0-1-.2 2.9 2.9 0 0 0 0 5.8 2.9 2.9 0 0 0 2.9-2.9V3h2.7z" />
    </svg>
  )
}

export function StoreFooter() {
  const config = useAppSelector(selectStorefrontConfig)
  const statusLinks = useAppSelector(selectStorefrontSocialLinks)
  const storeName = config?.name ?? STORE_NAME
  const links = config?.socialLinks ?? statusLinks
  const social = SOCIAL_LINKS.flatMap((item) => {
    const href = socialHref(links, item.key)
    return href ? [{ ...item, href }] : []
  })

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.identity}>
          <p className={styles.brand}>{storeName}</p>
          {social.length > 0 ? (
            <nav className={styles.social} aria-label="Redes sociales">
              {social.map((item) => (
                <a key={item.key} className={styles.socialLink} href={item.href} target="_blank" rel="noreferrer">
                  <SocialIcon name={item.key} />
                  <span className="visually-hidden">{item.label}</span>
                </a>
              ))}
            </nav>
          ) : null}
        </div>
        <div className={styles.meta}>
          <p>Precios en USD. Catálogo sujeto a disponibilidad de inventario.</p>
          <Link to="/privacidad" className={styles.legalLink}>
            Política de tratamiento de datos
          </Link>
          <a
            href={ECUNEXO_URL}
            target="_blank"
            rel="noreferrer"
            className={styles.creditLink}
          >
            Desarrollado por EcuNexo
          </a>
        </div>
      </div>
    </footer>
  )
}
