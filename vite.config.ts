import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

export default defineConfig({
  plugins: [
    solidPlugin(),
    (monacoEditorPlugin as any).default({
      languageWorkers: ['editorWorkerService', 'json', 'typescript', 'html', 'css'],
    }),
  ],
  base: './',
  build: {
    outDir: 'dist',
    target: 'esnext',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
