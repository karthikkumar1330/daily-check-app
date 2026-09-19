import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// vite-plugin-pwa generates this virtual module at build time. It registers
// the service worker so the app keeps working offline after first load.
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
