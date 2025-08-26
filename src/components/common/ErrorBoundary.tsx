import React from "react";

/**
 * ErrorBoundary that detects chunk-load errors and exposes a global flag
 * so the app can selectively remount routes *only when necessary*.
 */
type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: Error };

declare global {
  interface Window {
    __APP_NEEDS_REMOUNT__?: boolean;
  }
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);

    // Mark that a remount may be required (e.g., after chunk-load failure)
    const msg = String(error?.message ?? "");
    const isChunkError =
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("ChunkLoadError");

    if (isChunkError) {
      window.__APP_NEEDS_REMOUNT__ = true;
      // Let the app know a chunk error happened
      window.dispatchEvent(new CustomEvent("app:chunk-error"));
    }
  }

  private reload = () => {
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
                ? "A part of the app didn’t load after the tab was sleeping. You can reload to continue."
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
