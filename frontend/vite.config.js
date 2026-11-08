import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";


export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        configure(proxy) {
          proxy.on("error", (_error, request, response) => {
            if (response.destroyed || response.writableEnded) return;

            const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
            if (requestUrl.pathname.startsWith("/api/auth/google")) {
              const route = requestUrl.searchParams.get("flow") === "signup" ? "signup" : "login";
              response.writeHead(302, { Location: `/${route}?oauth_error=api_unavailable` });
              response.end();
              return;
            }

            response.writeHead(503, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ error: "Account API unavailable. Start the Flask backend on port 5000." }));
          });
        },
      },
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});