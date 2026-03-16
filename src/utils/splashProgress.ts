/**
 * Splash screen removal.
 * Called once React has mounted — fills the bar to 100% and fades out.
 * Message rotation runs as inline JS in index.html during bundle load.
 */

let removed = false;

export function removeSplash() {
  if (removed) return;
  removed = true;

  // Stop the message rotation and progress tick started in index.html
  if ((window as any).__splashMsgInterval) {
    clearInterval((window as any).__splashMsgInterval);
  }
  if ((window as any).__splashTickInterval) {
    clearInterval((window as any).__splashTickInterval);
  }

  const progressEl = document.getElementById("splash-progress");
  const statusEl = document.getElementById("splash-status");
  const splashEl = document.getElementById("initial-splash");

  if (statusEl) statusEl.textContent = "Ready — launching...";
  if (progressEl) progressEl.style.width = "100%";

  if (splashEl) {
    // Let the CSS transition (160ms) fill the bar, then fade out
    setTimeout(() => {
      splashEl.classList.add("fade-out");
      setTimeout(() => {
        try { splashEl.remove(); } catch {}
      }, 320);
    }, 180);
  }
}
