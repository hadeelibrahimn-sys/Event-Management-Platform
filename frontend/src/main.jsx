import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { API_BASE_URL } from './api.js'

// Uses the deployed backend for API requests in production.
// Locally, Vite handles the API requests through its proxy.
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
