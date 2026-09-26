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
