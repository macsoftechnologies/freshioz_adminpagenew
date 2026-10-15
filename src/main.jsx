import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AdminRoleProvider } from './context/AdminRoleContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import './styles/admin.css';
import 'leaflet/dist/leaflet.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={window.location.pathname.startsWith('/admin') ? '/admin' : '/'}>
      <AdminRoleProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AdminRoleProvider>
    </BrowserRouter>
  </React.StrictMode>
);
