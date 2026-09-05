import "./styles/index.css";
import { ThemeProvider } from "@repo/ui/lib/theme-provider";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ErrorBoundary } from "#/app/providers/ErrorBoundary";
import { PdfManagerPage } from "#/pages/pdf-manager";

const rootElement = document.getElementById("root");

if (rootElement === null) throw new Error("#root が見つかりません");

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <ErrorBoundary>
        <PdfManagerPage />
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
);
