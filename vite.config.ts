import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), UnoCSS()],
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'lib/main.ts'),
      name: 'cheshirecode-sample-refresh-token',
      // the proper extensions will be added
      fileName: 'lib',
    },
    rollupOptions: {
      external: ['react', 'unocss', '/vite.svg'],
      output: {
        globals: {
          react: 'react',
        },
      },
    },
  },
})
