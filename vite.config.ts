import { resolve } from "path"
import { defineConfig } from "vite"


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
    }
})