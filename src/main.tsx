import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './features/auth/context/AuthProvider'
import SessionLoader from './components/common/SessionLoader'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SessionLoader>
        <App />
      </SessionLoader>
    </AuthProvider>
  </StrictMode>,
)
