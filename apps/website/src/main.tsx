import { ThemeProvider } from "@repo/ui/lib/theme-provider";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "#/app.tsx";
import "#/styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element in index.html");

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
