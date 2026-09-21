import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// vite-plugin-pwa generates this virtual module at build time. It registers
// the service worker so the app keeps working offline after first load.
import { registerSW } from "virtual:pwa-register";

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
} else if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
