import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary.jsx';
import { enforceSession } from './services/session';
import './styles/global.css';
import './styles/variables.css';
import './styles/responsive.css';

// Enforce the 14-day login window once, before the app renders. If the last
// login was more than two weeks ago the stale session is cleared so the user
// is asked to log in again; otherwise the window slides forward and they stay
// logged in.
enforceSession();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
