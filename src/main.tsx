import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './smartledger-pro-theme.css'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import App from './App.tsx'
import AuthGate from './auth/AuthGate'
import { migrateLegacyData } from './lib/dataMigration'

migrateLegacyData()

// Render the application immediately. A missing or delayed native Back plugin
// must never prevent React from mounting and leave Android on a blank screen.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate><App /></AuthGate>
  </StrictMode>,
)

if (Capacitor.getPlatform() === 'android') {
  void CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    window.dispatchEvent(new CustomEvent('smartledger:native-back', {
      detail: { canGoBack },
    }))
  }).catch(() => {
    // Keep the web app usable even if native Back listener registration fails.
  })
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => undefined)
  })
}
