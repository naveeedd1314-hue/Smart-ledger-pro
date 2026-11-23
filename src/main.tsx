import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './smartledger-pro-theme.css'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import App from './App.tsx'
import { migrateLegacyData } from './lib/dataMigration'

migrateLegacyData()

// Register once before React mounts so Android Back is always intercepted.
if (Capacitor.isNativePlatform()) {
  void CapacitorApp.addListener('backButton', () => {
    window.dispatchEvent(new Event('smartledger:native-back'))
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => undefined)
  })
}
