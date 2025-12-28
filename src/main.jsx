import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import AuthGate from "./components/AuthGate";


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGate fallback={<div style={{ padding: 24 }}>Cargando sesión…</div>}>
      <App />
    </AuthGate>
  </React.StrictMode>
);
import { registerSW } from "virtual:pwa-register";

registerSW({
  onNeedRefresh() {
    window.location.reload();
  },
});
