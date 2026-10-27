import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './context/Theme';
import { MotionProvider } from './context/Motion';
import { ToastProvider } from './context/Toast';
import { AuthProvider } from './context/Auth';
import { SavedJobsProvider } from './context/SavedJobs';
import './styles/tokens.css';
import './styles/base.css';
import './styles/effects.css';
import './styles/components.css';
import './styles/pages.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <MotionProvider>
          <ToastProvider>
            <AuthProvider>
              <SavedJobsProvider>
                <App />
              </SavedJobsProvider>
            </AuthProvider>
          </ToastProvider>
        </MotionProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
