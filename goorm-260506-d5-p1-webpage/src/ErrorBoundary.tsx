import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** 자식 트리에서 처리되지 않은 예외 시 흰 화면 대신 안내 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
          <div className="mx-auto max-w-lg rounded-lg border border-red-200 bg-white p-6 shadow-sm">
            <h1 className="text-lg font-semibold text-red-700">화면을 그리는 중 오류가 났습니다</h1>
            <p className="mt-2 text-sm text-slate-600">
              브라우저 개발자 도구(F12) 콘솔에 자세한 로그가 있습니다. 아래 메시지를 참고하거나 페이지를
              새로고침해 보세요.
            </p>
            <pre className="mt-4 max-h-48 overflow-auto rounded bg-slate-100 p-3 text-xs text-left whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
              onClick={() => this.setState({ error: null })}
            >
              다시 시도
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
