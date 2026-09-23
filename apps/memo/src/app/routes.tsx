import { createBrowserRouter } from "react-router";

import { HomePage } from "#/pages/home";
import { MemoPage } from "#/pages/memo";
import { SettingsPage } from "#/pages/settings";
import { TimetablePage } from "#/pages/timetable";
import { AppShell } from "#/widgets/app-shell";

export const router = createBrowserRouter(
  [
    {
      element: <AppShell />,
      children: [
        { index: true, element: <HomePage /> },
        { path: "memo", element: <MemoPage /> },
        { path: "timetable", element: <TimetablePage /> },
        { path: "settings", element: <SettingsPage /> },
      ],
    },
  ],
  {
    // Vite の `base` と揃える。リンクは "/memo" のようにアプリ内の絶対パスで書いてよい
    basename: import.meta.env.BASE_URL,
  },
);
