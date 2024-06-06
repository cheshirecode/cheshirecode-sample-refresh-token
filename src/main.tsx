/* c8 ignore next 20 */
// not going to test this unless E2E
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

/* eslint-disable sort-imports */
import "@/styles/index.css";
import "@/styles/reset.css";
/* eslint-enable sort-imports */
import "virtual:uno.css";
// uno
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
