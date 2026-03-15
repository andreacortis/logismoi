import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Replace YOUR_REPO_NAME with your actual GitHub repository name
// e.g. if your repo is github.com/username/catastrophe-theory
// set base to '/catastrophe-theory/catastrophes/'
export default defineConfig({
  plugins: [react()],
  base: '/logismoi/catastrophes/',
})
