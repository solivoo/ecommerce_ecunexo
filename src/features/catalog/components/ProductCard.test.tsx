import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { StorefrontProduct } from '@/api/types'
import { ProductCard } from './ProductCard'

const product: StorefrontProduct = {
  id: 'p1',
  kind: 'physical',
  name: 'Calcetín Runner',
  description: null,
  price: 3.5,
  thumbUrl: null,
  mediumUrl: 'https://cdn/main.webp',
  secondMediumUrl: 'https://cdn/second.webp',
  colors: ['Negro', 'Blanco', 'Rojo', 'Azul', 'Verde', 'Morado'],
  inStock: true,
  hasVariants: false,
  variantCount: 0,
  isNew: true,
  createdAt: '2026-01-01T00:00:00Z',
}

function renderCard(value: StorefrontProduct = product) {
  return render(
    <MemoryRouter>
      <ProductCard product={value} />
    </MemoryRouter>,
  )
}

describe('ProductCard', () => {
  it('muestra el badge Nuevo y los swatches limitados a cinco', () => {
    renderCard()

    expect(screen.getByText('Nuevo')).toBeInTheDocument()
    expect(screen.getByTitle('Negro')).toBeInTheDocument()
    expect(screen.getByTitle('Blanco')).toBeInTheDocument()
    expect(screen.getByTitle('Verde')).toBeInTheDocument()
    expect(screen.queryByTitle('Morado')).not.toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  it('apila la segunda imagen junto a la principal', () => {
    const { container } = renderCard()

    const images = container.querySelectorAll('img')
    expect(images).toHaveLength(2)
    expect(images[0]).toHaveAttribute('src', 'https://cdn/main.webp')
    expect(images[1]).toHaveAttribute('src', 'https://cdn/second.webp')
  })

  it('no muestra badge ni swatches cuando no aplica', () => {
    const { container } = renderCard({ ...product, isNew: false, colors: [], secondMediumUrl: null })

    expect(screen.queryByText('Nuevo')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Colores disponibles')).not.toBeInTheDocument()
    expect(container.querySelectorAll('img')).toHaveLength(1)
  })
})
