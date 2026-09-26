import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import '@fontsource-variable/archivo'
import '@/styles/tokens.css'
import '@/styles/global.css'
import { configureApiClient } from '@/api/client'
import { router } from '@/app/router'
import { store } from '@/app/store'

configureApiClient(store)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
)
