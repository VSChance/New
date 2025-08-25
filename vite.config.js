import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // Or your framework's plugin

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()], // Make sure to include your framework plugin if you use one
  server: {
    host: '0.0.0.0', // This makes the server accessible externally
    hmr: {
      clientPort: 443 // Use port 443 for HMR websocket connections in Gitpod
    },
    // The following is the key part to fix the "Blocked request" error
    allowedHosts: ['.gitpod.io']
  }
});