import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  server: { proxy: { '/api': `http://localhost:${process.env.PORT || 8787}` } },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
