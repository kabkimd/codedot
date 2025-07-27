import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: ["code.kabkimd.nl", "kabkimd.nl"],
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    cssMinify: true,
    // optional: silence the warning, but still try to split smartly
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("@codemirror") || id.includes("codemirror"))
            return "codemirror";

          if (id.includes("@uiw/react-codemirror"))
            return "codemirror-react";

          if (id.includes("react-router"))
            return "router";

          if (id.includes("lucide-react") || id.includes("next-themes"))
            return "ui";

          if (
            id.includes("react") ||
            id.includes("scheduler") ||
            id.includes("use-sync-external-store")
          )
            return "vendor";
        },
      },
    },
  },
  // you usually don't need this unless you're working around a dev prebundle quirk
  // optimizeDeps: {
  //   include: ['react', 'react-dom', 'react-router-dom']
  // }
}));
