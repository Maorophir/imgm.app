import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applySavedStyle } from './lib/styles.js'

// Local development only: the button-and-type style being tried (lib/styles.js)
if (import.meta.env.DEV) applySavedStyle()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
