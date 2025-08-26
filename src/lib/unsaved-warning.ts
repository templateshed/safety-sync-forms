// src/lib/unsaved-warning.ts
// Opt-in global "are you sure?" when leaving the page.
// Call enableUnsavedWarning() when a form is dirty, disableUnsavedWarning() when it's saved.

let enabled = false;
const handler = (e: BeforeUnloadEvent) => {
  if (!enabled) return;
  e.preventDefault();
  // Most browsers ignore custom text now, but this triggers the native prompt.
  e.returnValue = "";
};

export function enableUnsavedWarning() {
  if (enabled) return;
  enabled = true;
  window.addEventListener("beforeunload", handler);
}

export function disableUnsavedWarning() {
  if (!enabled) return;
  enabled = false;
  window.removeEventListener("beforeunload", handler);
}
