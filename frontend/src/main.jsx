import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { API_BASE_URL } from './api.js'

// In production, redirect all /api requests to the deployed backend.
// Locally API_BASE_URL is empty, so Vite's proxy continues to work.
const originalFetch = window.fetch.bind(window)

window.fetch = (input, options) => {
  if (
    typeof input === 'string' &&
    input.startsWith('/api/') &&
    API_BASE_URL
  ) {
    input = `${API_BASE_URL}${input}`
  }

  return originalFetch(input, options)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
