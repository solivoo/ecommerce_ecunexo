import type { StorefrontMatrixAxis, StorefrontVariant } from '@/api/types'

export type VariantSelection = Record<string, string>

export function initialSelection(
  variants: StorefrontVariant[],
  axes: StorefrontMatrixAxis[],
): VariantSelection {
  if (axes.length === 0) return {}

  const preferred = variants.find((variant) => variant.inStock) ?? variants[0]
  const selection: VariantSelection = {}
  for (const axis of axes) {
    selection[axis.name] = preferred?.dimensions?.[axis.name] ?? axis.values[0] ?? ''
  }
  return selection
}

export function findVariant(
  variants: StorefrontVariant[],
  axes: StorefrontMatrixAxis[],
  selection: VariantSelection,
): StorefrontVariant | null {
  if (axes.length === 0) return variants[0] ?? null

  return (
    variants.find((variant) =>
      axes.every(
        (axis) => (variant.dimensions?.[axis.name] ?? '') === selection[axis.name],
      ),
    ) ?? null
  )
}

export function availableAxisValues(
  axis: StorefrontMatrixAxis,
  axes: StorefrontMatrixAxis[],
  variants: StorefrontVariant[],
  selection: VariantSelection,
): string[] {
  const otherAxes = axes.filter((candidate) => candidate.name !== axis.name)
  const values = new Set(
    variants
      .filter((variant) =>
        otherAxes.every(
          (other) => (variant.dimensions?.[other.name] ?? '') === selection[other.name],
        ),
      )
      .map((variant) => variant.dimensions?.[axis.name])
      .filter((value): value is string => Boolean(value)),
  )

  const ordered = axis.values.filter((value) => values.has(value))
  const extras = [...values].filter((value) => !axis.values.includes(value))
  return [...ordered, ...extras]
}

export function isHexColor(value: string): boolean {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())
}
