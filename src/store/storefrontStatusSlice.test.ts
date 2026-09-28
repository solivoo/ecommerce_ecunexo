import { describe, expect, it } from 'vitest'
import { resolveStatusTransition } from './storefrontStatusSlice'

const base = {
  appliedRevision: '100',
  pendingRevision: null as string | null,
  stableChecks: 0,
  isUpdating: false,
}

describe('resolveStatusTransition', () => {
  it('adopta la primera revisión sin mostrar la cortina', () => {
    const result = resolveStatusTransition(
      { ...base, appliedRevision: null },
      '100',
    )

    expect(result.appliedRevision).toBe('100')
    expect(result.isUpdating).toBe(false)
    expect(result.shouldReload).toBe(false)
  })

  it('sin cambios mantiene el contenido y no recarga', () => {
    const result = resolveStatusTransition(base, '100')

    expect(result.appliedRevision).toBe('100')
    expect(result.isUpdating).toBe(false)
    expect(result.shouldReload).toBe(false)
  })

  it('detecta un cambio y levanta la cortina de actualización', () => {
    const result = resolveStatusTransition(base, '200')

    expect(result.isUpdating).toBe(true)
    expect(result.pendingRevision).toBe('200')
    expect(result.appliedRevision).toBe('100')
    expect(result.shouldReload).toBe(false)
  })

  it('confirma la estabilidad en el siguiente chequeo y recarga', () => {
    const detected = resolveStatusTransition(base, '200')
    const confirmed = resolveStatusTransition(detected, '200')

    expect(detected.isUpdating).toBe(true)
    expect(detected.shouldReload).toBe(false)

    expect(confirmed.shouldReload).toBe(true)
    expect(confirmed.isUpdating).toBe(false)
    expect(confirmed.appliedRevision).toBe('200')
  })

  it('si la revisión sigue cambiando, reinicia la estabilidad', () => {
    const first = resolveStatusTransition(base, '200')
    const changed = resolveStatusTransition(first, '300')

    expect(changed.pendingRevision).toBe('300')
    expect(changed.stableChecks).toBe(1)
    expect(changed.shouldReload).toBe(false)
  })
})
