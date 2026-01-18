import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Make React use Preact's compatibility layer
      // This is needed because @molstar/molstar-components (JSR package) uses Preact,
      // but our own code uses React. These aliases allow them to work together.
      react: "preact/compat",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime",
      "react/jsx-dev-runtime": "preact/jsx-dev-runtime",

      // Map Deno-style npm: imports to actual node_modules packages
      // These are used by @molstar/molstar-components (JSR package) internally
      "npm:preact@10.28.1": "preact",
      "npm:preact@10.28.1/hooks": "preact/hooks",
      "npm:preact@10.28.1/jsx-runtime": "preact/jsx-runtime",
      "npm:preact@10.28.1/jsx-dev-runtime": "preact/jsx-dev-runtime",

      // Monaco editor mappings for @molstar/molstar-components
      "npm:monaco-editor@0.55.1/esm/vs/editor/editor.api.js": "monaco-editor",
      "npm:monaco-editor@0.55.1/esm/vs/language/typescript/ts.worker.js":
        "monaco-editor/esm/vs/language/typescript/ts.worker.js",
      "npm:monaco-editor@0.55.1/esm/vs/basic-languages/javascript/javascript.js":
        "monaco-editor/esm/vs/basic-languages/javascript/javascript.js",
      "npm:monaco-editor@0.55.1/esm/vs/language/typescript/monaco.contribution.js":
        "monaco-editor/esm/vs/language/typescript/monaco.contribution.js",

      // Map JSR imports to npm equivalents
      "jsr:@molstar/mol-view-stories@1.0.4": "@jsr/molstar__mol-view-stories",
    },
  },
  optimizeDeps: {
    // Pre-bundle these dependencies for better dev performance
    include: [
      "@molstar/molstar-components",
      "monaco-editor",
      "preact",
      "preact/hooks",
      "preact/compat",
    ],
    esbuildOptions: {
      // Configure JSX for Preact compatibility
      jsx: "automatic",
      jsxImportSource: "preact",
    },
  },
  worker: {
    format: "es",
  },
});
