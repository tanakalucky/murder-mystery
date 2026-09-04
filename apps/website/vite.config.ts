import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

// https://viteplus.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
