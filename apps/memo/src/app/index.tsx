import "./styles/index.css";
import { ThemeProvider } from "@repo/ui/lib/theme-provider";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";

import { ErrorBoundary } from "#/app/providers/ErrorBoundary";

import { router } from "./routes";

const rootElement = document.getElementById("root");

if (rootElement === null) throw new Error("#root が見つかりません");

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
);
