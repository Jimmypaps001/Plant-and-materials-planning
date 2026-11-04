import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { markPainted } from "./lib/splash";

const el = document.getElementById("planning-root");
if (el) {
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  // After the first paint, not before it; the cover also waits out its floor and any data in flight.
  requestAnimationFrame(() => requestAnimationFrame(markPainted));
}
