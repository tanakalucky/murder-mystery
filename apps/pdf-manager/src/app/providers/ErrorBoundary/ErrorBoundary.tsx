import { Button } from "@repo/ui/components/button";

import { type ReactNode, useCallback, useState } from "react";

import { type FallbackProps, ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

export const ErrorBoundary = ({ children, fallback }: Props) => {
  const renderFallback = useCallback(
    (props: FallbackProps) => {
      if (fallback) {
        return <>{fallback}</>;
      }
      return <ErrorFallback {...props} />;
    },
    [fallback],
  );

  return (
    <ReactErrorBoundary fallbackRender={renderFallback} onError={onError}>
      {children}
    </ReactErrorBoundary>
  );
};

const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-5 text-destructive">
      <h2 className="text-lg font-semibold">エラーが発生しました</h2>

      <p className="mt-1">画面の表示中にエラーが発生しました。</p>

      <details className="mt-2.5" open={isOpen} onToggle={(e) => setIsOpen(e.currentTarget.open)}>
        <summary className="cursor-pointer">エラーの詳細</summary>
        <pre className="mt-2.5 overflow-auto rounded bg-muted p-2.5 text-foreground">
          {getErrorMessage(error)}
        </pre>
      </details>

      <Button variant="destructive" className="mt-2.5" onClick={resetErrorBoundary}>
        もう一度試す
      </Button>
    </div>
  );
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const onError = (error: unknown) => {
  console.error("ErrorBoundary caught an error:", error);
};
