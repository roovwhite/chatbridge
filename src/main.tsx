// Roboto поставляется с приложением (без запросов к Google Fonts); подключены только нужные начертания
import '@fontsource/roboto/cyrillic-400.css'
import '@fontsource/roboto/cyrillic-500.css'
import '@fontsource/roboto/cyrillic-600.css'
import '@fontsource/roboto/cyrillic-700.css'
import '@fontsource/roboto/latin-400.css'
import '@fontsource/roboto/latin-500.css'
import '@fontsource/roboto/latin-600.css'
import '@fontsource/roboto/latin-700.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
