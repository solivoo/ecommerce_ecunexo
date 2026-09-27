const currencyFormatter = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

const quantityFormatter = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 2 })

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Consultar'
  }
  return currencyFormatter.format(value)
}

export function formatQuantity(value: number): string {
  return quantityFormatter.format(value)
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function discountPercentFrom(
  originalPrice: number | null | undefined,
  price: number | null | undefined,
): number | null {
  if (
    originalPrice === null ||
    originalPrice === undefined ||
    price === null ||
    price === undefined ||
    originalPrice <= 0 ||
    price >= originalPrice
  ) {
    return null
  }

  const percent = Math.round((1 - price / originalPrice) * 100)
  return percent > 0 ? percent : null
}
