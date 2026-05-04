import { Component, type ErrorInfo, type ReactNode } from "react";
import QuoteCard from "./QuoteCard";

class ErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state: { err: Error | null } = { err: null };

  static getDerivedStateFromError(err: Error) {
    return { err };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error(err, info.componentStack);
  }

  render() {
    if (this.state.err) {
      return (
        <div
          style={{
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
            maxWidth: 640,
            margin: "0 auto",
          }}
        >
          <h1 style={{ color: "#b91c1c", fontSize: "1.25rem" }}>실행 중 오류가 났습니다</h1>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#fef2f2",
              padding: "1rem",
              borderRadius: 8,
              fontSize: "0.85rem",
            }}
          >
            {this.state.err.stack ?? this.state.err.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <QuoteCard />
    </ErrorBoundary>
  );
}
