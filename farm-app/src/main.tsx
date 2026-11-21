import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { isPublicDemoRoute } from './lib/sharedDemoMode.ts'
import { startPublicDemo } from './lib/publicDemo.ts'

const root = createRoot(document.getElementById('root')!)

function renderApp() {
  root.render(<StrictMode><AuthProvider><App /></AuthProvider></StrictMode>)
}

if (isPublicDemoRoute) {
  void startPublicDemo().then(renderApp).catch((error: unknown) => {
    root.render(<main className="route-loading" role="alert"><h1>Public demo is not ready yet</h1><p>{error instanceof Error ? error.message : 'The shared demo could not connect.'}</p><p>The normal farm application is unchanged. Please complete the demo database setup, then reload this page.</p></main>)
  })
} else {
  renderApp()
}
