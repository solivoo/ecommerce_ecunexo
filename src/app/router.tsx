import { createBrowserRouter } from 'react-router-dom'
import { StoreLayout } from '@/layout/StoreLayout'
import { RouteErrorPage } from '@/pages/errors/RouteErrorPage'
import { NotFoundPage } from '@/pages/not-found/NotFoundPage'

export const router = createBrowserRouter([
  {
    element: <StoreLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        lazy: async () => {
          const { CatalogPage } = await import('@/pages/catalog/CatalogPage')
          return { Component: CatalogPage }
        },
      },
      {
        path: 'producto/:productId',
        lazy: async () => {
          const { ProductDetailPage } = await import('@/pages/product/ProductDetailPage')
          return { Component: ProductDetailPage }
        },
      },
      {
        path: 'checkout',
        lazy: async () => {
          const { CheckoutPage } = await import('@/pages/checkout/CheckoutPage')
          return { Component: CheckoutPage }
        },
      },
      {
        path: 'pedido/confirmado',
        lazy: async () => {
          const { OrderConfirmedPage } = await import(
            '@/pages/checkout/OrderConfirmedPage'
          )
          return { Component: OrderConfirmedPage }
        },
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
