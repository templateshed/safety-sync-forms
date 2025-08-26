import React from "react";

const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
