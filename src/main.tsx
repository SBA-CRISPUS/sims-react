import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'
import { AuthProvider } from './features/auth/context/AuthProvider'
import SessionLoader from './components/common/SessionLoader'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessionLoader>
          <App />
        </SessionLoader>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
