import {StrictMode, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerPwa } from './services/registerPwa';

registerPwa();

const ResumeViewer = lazy(() => import('./components/ResumeViewer'));
const isResume = /^\/resume\/?$/i.test(window.location.pathname);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isResume ? <Suspense fallback={<p role="status">Loading resume…</p>}><ResumeViewer /></Suspense> : <App />}
  </StrictMode>,
);
