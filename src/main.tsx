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

// Await native listener registration before mounting the UI. Capacitor's
// default Android Back action exits the activity when no listener is ready.
async function bootstrap() {
  if (Capacitor.getPlatform() === 'android') {
    await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      window.dispatchEvent(new CustomEvent('smartledger:native-back', {
        detail: { canGoBack },
      }))
    })
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthGate><App /></AuthGate>
    </StrictMode>,
  )
}

void bootstrap()

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => undefined)
  })
}
