// src/lib/focus-revalidate.ts
// Call a callback whenever the app regains focus or becomes visible.

type Cleanup = () => void;

export function onAppResume(cb: () => void): Cleanup {
  const handler = () => {
    // Many browsers fire both focus + visibilitychange; debounce a little.
    if (document.visibilityState === "visible") {
      cb();
    }
  };

  window.addEventListener("focus", handler);
  document.addEventListener("visibilitychange", handler);

  return () => {
    window.removeEventListener("focus", handler);
    document.removeEventListener("visibilitychange", handler);
  };
}
