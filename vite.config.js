import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: [
                "icons/favicon-16.png",
                "icons/favicon-32.png",
                "icons/apple-touch-icon.png"
            ],
            manifest: {
                name: "Daily Check",
                short_name: "Daily Check",
                description: "A clean, minimal daily checklist, todo list, and weekly progress tracker.",
                start_url: "/",
                scope: "/",
                display: "standalone",
                orientation: "portrait",
                background_color: "#F7F7F4",
                theme_color: "#2F6F5E",
                icons: [
                    {
                        src: "icons/icon-192.png",
                        sizes: "192x192",
                        type: "image/png",
                        purpose: "any"
                    },
                    {
                        src: "icons/icon-512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any"
                    },
                    {
                        src: "icons/icon-maskable-512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable"
                    }
                ]
            },
            workbox: {
                // Precache the app shell so the whole app works offline after first load.
                globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
                navigateFallback: "/index.html",
                cleanupOutdatedCaches: true
            },
            devOptions: {
                // Lets you test install/offline behavior with `npm run dev` too.
                enabled: true,
                type: "module"
            }
        })
    ],
    server: {
        host: "0.0.0.0",
        port: 3000
    }
});
