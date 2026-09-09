import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** Static SPA for look-dev iPad checks. GitHub Pages only. */
const builtAt = new Date().toISOString();

export default defineConfig({
  root: fileURLToPath(new URL("./pages-entry", import.meta.url)),
  base: "/",
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  define: {
    "import.meta.env.VITE_BUILD_AT": JSON.stringify(builtAt),
  },
  plugins: [tailwindcss(), viteReact()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL("./dist-pages", import.meta.url)),
    emptyOutDir: true,
  },
});
