import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import 'maplibre-gl/dist/maplibre-gl.css'
import App from './App.jsx'
import PasswordGate from './components/PasswordGate.jsx'

registerSW({ immediate: true })

createRoot(document.getElementById('app')).render(
  <StrictMode>
    <PasswordGate>
      <App />
    </PasswordGate>
  </StrictMode>,
)
