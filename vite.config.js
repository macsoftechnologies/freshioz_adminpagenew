import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/admin/',
  plugins: [
    tailwindcss(),
    react()
  ],
  server: {
    host: true,
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('leaflet')) {
              return 'vendor-leaflet';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-lucide';
            }
            return 'vendor';
          }
          if (id.includes('/src/pages/') || id.includes('\\src\\pages\\')) {
            if (id.includes('MasterDataPage') || id.includes('DailyPricingPage')) {
              return 'page-catalog';
            }
            if (id.includes('Procurement') || id.includes('Warehouse')) {
              return 'page-warehouse-ops';
            }
            if (id.includes('Societies') || id.includes('Society') || id.includes('Sales')) {
              return 'page-societies';
            }
            if (id.includes('Employee') || id.includes('Financial') || id.includes('Vendors')) {
              return 'page-admin-mgmt';
            }
          }
        }
      }
    }
  }
})
