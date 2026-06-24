import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { UIProvider } from './contexts/UIContext';

// Force clear ALL cookies on localhost to prevent 431 Request Header Fields Too Large error
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  document.cookie.split(";").forEach((c) => {
    const cookie = c.replace(/^ +/, "").split("=")[0];
    document.cookie = `${cookie}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    document.cookie = `${cookie}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/supabase-proxy`;
  });
  
  // If the URL contains ?reset=1, completely nuke local storage
  if (window.location.search.includes('reset=1')) {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UIProvider>
      <App />
    </UIProvider>
  </StrictMode>,
);
