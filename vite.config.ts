import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import monacoEditorPluginModule from 'vite-plugin-monaco-editor';

const monacoEditorPlugin: typeof monacoEditorPluginModule =
  (monacoEditorPluginModule as any).default ?? monacoEditorPluginModule;

export default defineConfig({
  plugins: [
    solidPlugin(),
    monacoEditorPlugin({
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
