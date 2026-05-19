import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync } from "node:fs";

const host = process.env.TAURI_DEV_HOST;
const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
) as { version?: string };
const appVersion = packageJson.version ?? "0.0.0";

export default defineConfig({
  // Disable Fast Refresh to avoid HMR incompatibility warnings during
  // development. This is a temporary workaround — consider refactoring
  // re-exports from component modules to fix the underlying cause.
  plugins: [react({ fastRefresh: false })],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  worker: {
    format: "es",
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three", "@react-three/fiber", "@react-three/drei", "@react-three/postprocessing", "postprocessing"],
          xyflow: ["@xyflow/react"],
          mermaid: ["mermaid"],
          codemirror: ["codemirror", "@codemirror/view", "@codemirror/state", "@codemirror/lang-json", "@codemirror/lint", "@codemirror/theme-one-dark"],
          markdown: ["react-markdown", "remark-gfm", "rehype-slug", "rehype-highlight", "highlight.js"],
        },
      },
    },
  },
  optimizeDeps: {
    include: ["@dagrejs/dagre", "@dagrejs/graphlib"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
