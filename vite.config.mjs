import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(
  {
    plugins: [],
    define: {
      'process.env': {}, 
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
      extensions: [
        '.js',
        '.json',
        '.jsx',
        '.mjs',
        '.ts',
        '.tsx',
        '.vue',
      ],
    },
    build: {
      lib: {
        // entry: {
        //   'shacl-vue': './index.js',
        //   'shapedata': './src/composables/shapedata.js'
        // },
        // name: 'ShaclVue',
        // fileName: (format, entryName) => `${entryName}.${format}.js`,
      },
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        // external: ['vue'],
        // output: {
        //   globals: {
        //     vue: 'vue',
        //   }
        // }
      },
    },
    server: {
      port: 3000,
    },
    base: './',
    test: {
      globals: true,
      environment: 'happy-dom',
    }
  }
)
