import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Determine network based on mode
  const isDevelopment = mode === "development";
  const network = isDevelopment ? "devnet" : "mainnet";

  console.log(`\n🚀 Building for ${network.toUpperCase()} (mode: ${mode})\n`);

  return {
    plugins: [react()],
    base: mode === "production" ? "/" : "/",
    define: {
      global: "globalThis",
      // Inject VITE_NETWORK as a compile-time constant
      "import.meta.env.VITE_NETWORK": JSON.stringify(network),
    },
    build: {
      outDir:
        mode === "development" || mode === "production"
          ? "../../API/SolanaPvP.API_Project/wwwroot"
          : "dist",
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            router: ["react-router-dom"],
            motion: ["framer-motion"],
            wallet: [
              "@solana/wallet-adapter-react",
              "@solana/wallet-adapter-base",
            ],
            ui: ["@heroicons/react", "@radix-ui/react-slot"],
          },
        },
        external: ["crypto", "stream"],
      },
      chunkSizeWarningLimit: 1000,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@/components": path.resolve(__dirname, "./src/components"),
        "@/pages": path.resolve(__dirname, "./src/pages"),
        "@/services": path.resolve(__dirname, "./src/services"),
        "@/store": path.resolve(__dirname, "./src/store"),
        "@/hooks": path.resolve(__dirname, "./src/hooks"),
        "@/types": path.resolve(__dirname, "./src/types"),
        "@/utils": path.resolve(__dirname, "./src/utils"),
        "@/constants": path.resolve(__dirname, "./src/constants"),
        "@/assets": path.resolve(__dirname, "./src/assets"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
          secure: false,
        },
        "/ws": {
          target: "ws://localhost:5000",
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});
