import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// הגדרת שפה עברית גלובלית
import moment from 'moment';
import 'moment/locale/he';
moment.locale('he', { week: { dow: 0 } }); // 0 = יום ראשון

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
