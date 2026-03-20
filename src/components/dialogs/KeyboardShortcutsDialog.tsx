import { useState, useEffect, useCallback } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { KEYBINDINGS, resolveKeybinding, type KeybindingDef } from "@/config/keybindings";

const CATEGORIES = ["Canvas", "Edit", "File", "View"] as const;

/** Convert a KeyboardEvent into a key combo string like "Ctrl+Shift+L" */
function eventToCombo(e: KeyboardEvent): string | null {
  const key = e.key;
  if (["Control", "Shift", "Alt", "Meta"].includes(key)) return null;

  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");

  if (key === " ") parts.push("Space");
  else if (key.length === 1) parts.push(key.toUpperCase());
  else parts.push(key);

  return parts.join("+");
}

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsPanel() {
  const keybindingOverrides = useSettingsStore((s) => s.keybindingOverrides);
  const setKeybindingOverride = useSettingsStore((s) => s.setKeybindingOverride);
  const resetKeybinding = useSettingsStore((s) => s.resetKeybinding);
  const resetAllKeybindings = useSettingsStore((s) => s.resetAllKeybindings);

  const [capturingId, setCapturingId] = useState<string | null>(null);

  const handleCapture = useCallback((e: KeyboardEvent) => {
    if (!capturingId) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.key === "Escape") {
      setCapturingId(null);
      return;
    }

    const combo = eventToCombo(e);
    if (!combo) return;

    setKeybindingOverride(capturingId, combo);
    setCapturingId(null);
  }, [capturingId, setKeybindingOverride]);

  useEffect(() => {
    if (!capturingId) return;
    document.addEventListener("keydown", handleCapture, { capture: true });
    return () => document.removeEventListener("keydown", handleCapture, { capture: true });
  }, [capturingId, handleCapture]);

  const hasOverrides = Object.keys(keybindingOverrides).length > 0;

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between pb-3">
        <div>
          <h3 className="text-sm font-semibold text-tn-text">Keyboard Shortcuts</h3>
          <p className="mt-1 text-xs text-tn-text-muted">Click a shortcut to record a new key combo. Press Esc to cancel capture.</p>
        </div>
        {hasOverrides && (
          <button
            onClick={resetAllKeybindings}
            className="text-[11px] text-tn-accent hover:underline"
          >
            Reset All
          </button>
        )}
      </div>

      <div className="min-h-0 overflow-y-auto rounded border border-tn-border">
        {CATEGORIES.map((cat) => {
          const bindings = KEYBINDINGS.filter((k) => k.category === cat);
          if (bindings.length === 0) return null;
          return (
            <div key={cat}>
              <div className="sticky top-0 z-10 bg-tn-surface px-4 py-1.5 text-[10px] font-semibold text-tn-text-muted uppercase tracking-wider border-b border-tn-border">
                {cat}
              </div>
              {bindings.map((kb) => (
                <ShortcutRow
                  key={kb.id}
                  def={kb}
                  resolved={resolveKeybinding(kb.id)}
                  isOverridden={!!keybindingOverrides[kb.id]}
                  isCapturing={capturingId === kb.id}
                  onStartCapture={() => setCapturingId(kb.id)}
                  onReset={() => resetKeybinding(kb.id)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function KeyboardShortcutsDialog({ open, onClose }: KeyboardShortcutsDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-tn-panel border border-tn-border rounded-lg shadow-xl w-[480px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 border-b border-tn-border">
          <h2 className="text-base font-semibold">Keyboard Shortcuts</h2>
        </div>

        <div className="flex-1 min-h-0 px-5 py-4">
          <KeyboardShortcutsPanel />
        </div>

        <div className="flex justify-end px-5 py-3 border-t border-tn-border">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm rounded border border-tn-border hover:bg-tn-surface"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface ShortcutRowProps {
  def: KeybindingDef;
  resolved: string;
  isOverridden: boolean;
  isCapturing: boolean;
  onStartCapture: () => void;
  onReset: () => void;
}

function ShortcutRow({ def, resolved, isOverridden, isCapturing, onStartCapture, onReset }: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-tn-border/40 last:border-b-0 hover:bg-tn-surface/30">
      <span className="text-xs text-tn-text">{def.label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={onStartCapture}
          className={`px-2.5 py-1 text-[11px] font-mono rounded border min-w-[90px] text-center transition-colors ${
            isCapturing
              ? "border-tn-accent bg-tn-accent/20 text-tn-accent animate-pulse"
              : isOverridden
              ? "border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
              : "border-tn-border bg-tn-bg text-tn-text-muted hover:bg-tn-surface"
          }`}
        >
          {isCapturing ? "Press key..." : resolved}
        </button>
        {isOverridden && (
          <button
            onClick={onReset}
            className="text-[11px] text-tn-text-muted hover:text-tn-text"
            title={`Reset to ${def.defaultKey}`}
          >
            ↩
          </button>
        )}
      </div>
    </div>
  );
}
