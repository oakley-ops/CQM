import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import App from './App';
import { store } from './store/store';
import theme from './theme';
import './index.css';

// Scrolling over a focused <input type="number"> silently increments/decrements
// its value — a data-integrity hazard on measurement entry (a stray wheel tick
// changes a recorded lab value). Blur the input instead so the page scrolls.
// Applies to every number field app-wide, including the specialized test forms.
document.addEventListener(
  'wheel',
  (e) => {
    const el = document.activeElement as HTMLInputElement | null;
    // Only when the wheel is over the focused input itself — that is exactly
    // (and only) when the browser would spin the value.
    if (el?.tagName === 'INPUT' && el.type === 'number' && e.target === el) el.blur();
  },
  { passive: true }
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
