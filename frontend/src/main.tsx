import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Polyfills for browser compatibility
import { Buffer } from 'buffer'
import process from 'process'

// Make Buffer and process available globally
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer
  ;(window as any).process = process
  ;(window as any).global = globalThis
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
