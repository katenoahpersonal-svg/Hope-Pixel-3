import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/app.css'

// No StrictMode: its double-invoke would build every canvas texture and every
// piece of hall geometry twice on load, for no benefit here.
createRoot(document.getElementById('root')).render(<App />)
