import { createBrowserRouter } from "react-router";

import { HomePage } from "#/pages/home";
import { MemoPage } from "#/pages/memo";
import { TimetablePage } from "#/pages/timetable";
import { AppShell } from "#/widgets/app-shell";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "memo", element: <MemoPage /> },
      { path: "timetable", element: <TimetablePage /> },
    ],
  },
]);
