import { useCallback, useEffect, useRef, useState } from 'react'
import type { StorefrontImage } from '@/api/types'
import { cx } from '@/lib/cx'
import styles from './ProductGallery.module.css'

interface ProductGalleryProps {
  images: StorefrontImage[]
  productName: string
}

const MIN_SCALE = 1
const MAX_SCALE = 3
const STEP_SCALE = 0.5

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function getTouchDistance(touches: TouchList): number {
  if (touches.length < 2) return 0
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.hypot(dx, dy)
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isInteracting, setIsInteracting] = useState(false)

  const stageRef = useRef<HTMLDivElement | null>(null)
  const stateRef = useRef({ scale: 1, x: 0, y: 0 })

  useEffect(() => {
    stateRef.current = { scale, x: offset.x, y: offset.y }
  }, [scale, offset.x, offset.y])

  const gestureRef = useRef<{
    mode: 'none' | 'pinch' | 'pan'
    startDistance: number
    startScale: number
    startX: number
    startY: number
    originX: number
    originY: number
    lastTapTime: number
    moved: boolean
  }>({
    mode: 'none',
    startDistance: 0,
    startScale: 1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    lastTapTime: 0,
    moved: false,
  })

  const active = images[activeIndex] ?? images[0]

  const clampOffset = useCallback((nextScale: number, nextX: number, nextY: number) => {
    if (nextScale <= 1) {
      return { x: 0, y: 0 }
    }
    const rect = stageRef.current?.getBoundingClientRect()
    const width = rect?.width || 320
    const height = rect?.height || 320
    const maxX = ((nextScale - 1) * width) / 2
    const maxY = ((nextScale - 1) * height) / 2
    return {
      x: clamp(nextX, -maxX, maxX),
      y: clamp(nextY, -maxY, maxY),
    }
  }, [])

  const resetZoom = useCallback(() => {
    setIsInteracting(false)
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  const applyScale = useCallback(
    (targetScale: number) => {
      const nextScale = clamp(Number(targetScale.toFixed(2)), MIN_SCALE, MAX_SCALE)
      if (nextScale <= 1.05) {
        resetZoom()
        return
      }
      setIsInteracting(false)
      setScale(nextScale)
      setOffset((current) => clampOffset(nextScale, current.x, current.y))
    },
    [clampOffset, resetZoom],
  )

  useEffect(() => {
    const element = stageRef.current
    if (!element) return

    const handleTouchStart = (event: TouchEvent) => {
      const g = gestureRef.current
      if (event.touches.length === 2) {
        event.preventDefault()
        g.mode = 'pinch'
        g.startDistance = getTouchDistance(event.touches)
        g.startScale = stateRef.current.scale
        g.moved = true
        setIsInteracting(true)
      } else if (event.touches.length === 1) {
        const touch = event.touches[0]
        g.startX = touch.clientX
        g.startY = touch.clientY
        g.originX = stateRef.current.x
        g.originY = stateRef.current.y
        g.moved = false
        if (stateRef.current.scale > 1) {
          g.mode = 'pan'
          setIsInteracting(true)
        } else {
          g.mode = 'none'
        }
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      const g = gestureRef.current
      if (event.touches.length === 2) {
        event.preventDefault()
        if (g.mode !== 'pinch') {
          g.mode = 'pinch'
          g.startDistance = getTouchDistance(event.touches)
          g.startScale = stateRef.current.scale
          setIsInteracting(true)
        }
        const distance = getTouchDistance(event.touches)
        if (g.startDistance > 0) {
          const rawScale = g.startScale * (distance / g.startDistance)
          const nextScale = clamp(rawScale, MIN_SCALE, MAX_SCALE)
          setScale(nextScale)
          setOffset((current) => clampOffset(nextScale, current.x, current.y))
        }
        g.moved = true
      } else if (event.touches.length === 1 && stateRef.current.scale > 1 && g.mode === 'pan') {
        const touch = event.touches[0]
        const dx = touch.clientX - g.startX
        const dy = touch.clientY - g.startY
        if (Math.hypot(dx, dy) > 4) {
          g.moved = true
        }
        event.preventDefault()
        const nextOffset = clampOffset(stateRef.current.scale, g.originX + dx, g.originY + dy)
        setOffset(nextOffset)
      }
    }

    const handleTouchEnd = (event: TouchEvent) => {
      const g = gestureRef.current
      if (event.touches.length === 0) {
        setIsInteracting(false)
        if (stateRef.current.scale <= 1.08) {
          setScale(1)
          setOffset({ x: 0, y: 0 })
        }

        if (!g.moved && event.changedTouches.length === 1) {
          const now = Date.now()
          if (now - g.lastTapTime < 280) {
            event.preventDefault()
            if (stateRef.current.scale > 1) {
              setScale(1)
              setOffset({ x: 0, y: 0 })
            } else {
              setScale(2)
              setOffset({ x: 0, y: 0 })
            }
            g.lastTapTime = 0
          } else {
            g.lastTapTime = now
          }
        }
        g.mode = 'none'
      } else if (event.touches.length === 1 && stateRef.current.scale > 1) {
        const touch = event.touches[0]
        g.mode = 'pan'
        g.startX = touch.clientX
        g.startY = touch.clientY
        g.originX = stateRef.current.x
        g.originY = stateRef.current.y
      }
    }

    const handlePointerDown = (event: PointerEvent) => {
      // El pan táctil ya va por TouchEvent; aquí mouse/stylus.
      if (event.pointerType === 'touch') return
      // button puede faltar en algunos entornos de test; solo bloquear clic derecho/medio.
      if (event.button === 1 || event.button === 2) return
      if (stateRef.current.scale <= 1) return
      const target = event.target as HTMLElement | null
      if (target?.closest(`.${styles.zoomControls}`)) return

      const g = gestureRef.current
      g.mode = 'pan'
      g.startX = event.clientX
      g.startY = event.clientY
      g.originX = stateRef.current.x
      g.originY = stateRef.current.y
      g.moved = false
      setIsInteracting(true)
      element.setPointerCapture?.(event.pointerId)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      const g = gestureRef.current
      if (g.mode !== 'pan' || stateRef.current.scale <= 1) return
      event.preventDefault()
      const dx = event.clientX - g.startX
      const dy = event.clientY - g.startY
      if (Math.hypot(dx, dy) > 4) {
        g.moved = true
      }
      setOffset(clampOffset(stateRef.current.scale, g.originX + dx, g.originY + dy))
    }

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      const g = gestureRef.current
      if (g.mode !== 'pan') return
      setIsInteracting(false)
      if (stateRef.current.scale <= 1.08) {
        setScale(1)
        setOffset({ x: 0, y: 0 })
      }
      g.mode = 'none'
      if (element.hasPointerCapture?.(event.pointerId)) {
        element.releasePointerCapture?.(event.pointerId)
      }
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd)
    element.addEventListener('touchcancel', handleTouchEnd)
    element.addEventListener('pointerdown', handlePointerDown)
    element.addEventListener('pointermove', handlePointerMove)
    element.addEventListener('pointerup', handlePointerUp)
    element.addEventListener('pointercancel', handlePointerUp)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchEnd)
      element.removeEventListener('pointerdown', handlePointerDown)
      element.removeEventListener('pointermove', handlePointerMove)
      element.removeEventListener('pointerup', handlePointerUp)
      element.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [clampOffset])

  if (!active) {
    return (
      <div className={styles.empty} aria-hidden="true">
        Sin imagen
      </div>
    )
  }

  const isZoomed = scale > 1

  return (
    <div className={styles.gallery}>
      <div
        ref={stageRef}
        className={cx(styles.stage, isZoomed && styles.stageZoomed)}
        onDoubleClick={() => {
          if (isZoomed) {
            resetZoom()
          } else {
            applyScale(2)
          }
        }}
      >
        <img
          className={cx(styles.stageImage, isInteracting && styles.stageImageInteracting)}
          src={active.largeUrl || active.mediumUrl}
          alt={active.altText ?? productName}
          draggable={false}
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
          }}
        />
        <div
          className={styles.zoomControls}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {isZoomed ? (
            <>
              <button
                type="button"
                className={styles.zoomButton}
                aria-label="Alejar imagen"
                onClick={() => applyScale(scale - STEP_SCALE)}
              >
                −
              </button>
              <button
                type="button"
                className={styles.zoomResetButton}
                aria-label="Restablecer zoom"
                onClick={resetZoom}
              >
                Restablecer
              </button>
              <button
                type="button"
                className={styles.zoomButton}
                aria-label="Acercar imagen"
                disabled={scale >= MAX_SCALE}
                onClick={() => applyScale(scale + STEP_SCALE)}
              >
                +
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.zoomToggleButton}
              aria-label="Ampliar imagen"
              onClick={() => applyScale(2)}
            >
              Ampliar +
            </button>
          )}
        </div>
      </div>
      {images.length > 1 ? (
        <ul className={styles.thumbs}>
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                className={cx(styles.thumb, index === activeIndex && styles.thumbActive)}
                aria-label={`Ver imagen ${index + 1}`}
                aria-current={index === activeIndex}
                onClick={() => {
                  setActiveIndex(index)
                  resetZoom()
                }}
              >
                <img src={image.thumbUrl} alt="" loading="lazy" decoding="async" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
