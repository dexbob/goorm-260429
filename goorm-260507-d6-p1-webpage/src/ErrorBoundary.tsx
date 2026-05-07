import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, message: "" };

  public static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : "알 수 없는 렌더링 오류";
    return { hasError: true, message };
  }

  public componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    console.error("[rag-ui] render error", error, errorInfo);
  }

  public render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="mx-auto max-w-3xl p-6 text-foreground">
        <h1 className="text-2xl font-semibold">화면 렌더링 오류가 발생했습니다.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          새로고침 후에도 반복되면 브라우저 콘솔 로그와 함께 알려 주세요.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-card p-3 text-xs text-amber-200">
          {this.state.message}
        </pre>
      </main>
    );
  }
}
