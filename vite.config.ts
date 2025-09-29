import { resolve } from "path"
import { defineConfig } from "vite"

require('dotenv').config()

export default defineConfig({
    base: './',
    root: 'src/renderer',
    build: {
        outDir: '../../dist/renderer',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/renderer/index.html'),
            }
        }
    },
    define: {
        'process.env.API_ID': JSON.stringify(process.env.API_ID),
        'process.env.API_HASH': JSON.stringify(process.env.API_HASH)
    }
})