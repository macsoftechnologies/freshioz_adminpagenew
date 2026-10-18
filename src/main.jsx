import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AdminRoleProvider } from './context/AdminRoleContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { registerServiceWorker } from './registerServiceWorker.js';
import './styles/admin.css';
import 'leaflet/dist/leaflet.css';

// Register Admin PWA Service Worker
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={window.location.pathname.startsWith('/admin') ? '/admin' : '/'}>
        <AdminRoleProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AdminRoleProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
