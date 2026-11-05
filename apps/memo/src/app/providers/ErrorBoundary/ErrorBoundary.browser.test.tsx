import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { ErrorBoundary } from "./ErrorBoundary";

describe("ErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("既定のエラー案内と詳細を日本語で表示する", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const screen = await render(
      <ErrorBoundary>
        <FailingContent state={{ shouldThrow: true }} />
      </ErrorBoundary>,
    );

    await expect
      .element(screen.getByRole("heading", { name: "エラーが発生しました" }))
      .toBeVisible();
    await expect.element(screen.getByText("画面の表示中にエラーが発生しました。")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "もう一度試す" })).toBeVisible();
    await expect.element(screen.getByText("テスト用のエラー")).not.toBeVisible();

    await screen.getByText("エラーの詳細", { exact: true }).click();

    await expect.element(screen.getByText("テスト用のエラー")).toBeVisible();
  });

  it("もう一度試すボタンから正常な内容を表示し直せる", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const state = { shouldThrow: true };
    const screen = await render(
      <ErrorBoundary>
        <FailingContent state={state} />
      </ErrorBoundary>,
    );

    state.shouldThrow = false;
    await screen.getByRole("button", { name: "もう一度試す" }).click();

    await expect.element(screen.getByText("表示できました")).toBeVisible();
    expect(screen.getByRole("heading", { name: "エラーが発生しました" }).query()).toBeNull();
  });

  it("指定された代替表示をそのまま使う", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const screen = await render(
      <ErrorBoundary fallback={<p>専用のエラー案内</p>}>
        <FailingContent state={{ shouldThrow: true }} />
      </ErrorBoundary>,
    );

    await expect.element(screen.getByText("専用のエラー案内")).toBeVisible();
    expect(screen.getByRole("button", { name: "もう一度試す" }).query()).toBeNull();
  });
});

const FailingContent = ({ state }: { state: { shouldThrow: boolean } }) => {
  if (state.shouldThrow) throw new Error("テスト用のエラー");

  return <p>表示できました</p>;
};
