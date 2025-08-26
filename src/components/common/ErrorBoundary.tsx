import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Hook your error tool here (Sentry, etc.)
    console.error("[ErrorBoundary]", error, info);
  }

  private reload = () => {
    // Soft reload (keeps HTTP cache)
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const message = String(this.state.error?.message ?? "");
      const isChunkError =
        message.includes("Failed to fetch dynamically imported module") ||
        message.includes("ChunkLoadError");

      return (
        <div className="min-h-screen grid place-items-center p-6">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mb-4">
              {isChunkError
                ? "It looks like a part of the app didn’t load after the tab was sleeping. Reload to continue."
                : "Please refresh the page. If the problem continues, contact support."}
            </p>
            <button className="px-4 py-2 rounded-md border" onClick={this.reload}>
              Reload app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
