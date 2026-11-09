import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import './index.css'
import App from './App.jsx'
import ThemeProvider from './components/ui/ThemeProvider'
import { Toaster } from './components/ui/Toaster'

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <ThemeProvider>
      <App />
      <Toaster />
    </ThemeProvider>
  </Provider>
)
