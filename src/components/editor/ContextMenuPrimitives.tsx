import { useState } from "react";
interface ContextMenuSubmenuProps {
  label: string;
  children: React.ReactNode;
}

export function ContextMenuSubmenu({ label, children }: ContextMenuSubmenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button className="w-full text-left px-3 py-1.5 flex justify-between items-center gap-4 text-tn-text hover:bg-tn-accent/15 transition-colors">
        <span>{label}</span>
        <span className="text-tn-text-muted/60 text-[11px]">▶</span>
      </button>
      {open && (
        <div className="absolute left-full top-0 bg-tn-surface border border-tn-border rounded-lg shadow-2xl py-1 min-w-[180px] z-[101]">
          {children}
        </div>
      )}
    </div>
  );
}
import { useEffect, useRef, type ReactNode } from "react";

interface ContextMenuOverlayProps {
  x: number;
  y: number;
  onClose: () => void;
  children: ReactNode;
}

export function ContextMenuOverlay({ x, y, onClose, children }: ContextMenuOverlayProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Clamp position to viewport
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      el.style.left = `${window.innerWidth - rect.width - 8}px`;
    }
    if (rect.bottom > window.innerHeight) {
      el.style.top = `${window.innerHeight - rect.height - 8}px`;
    }
  }, [x, y]);

  // Close on Escape, scroll, or resize
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function handleClose() {
      onClose();
    }
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleClose);
    window.addEventListener("scroll", handleClose, true);
    return () => {
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleClose);
      window.removeEventListener("scroll", handleClose, true);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100]" onMouseDown={onClose} onContextMenu={(e) => e.preventDefault()}>
      <div
        ref={menuRef}
        className="absolute bg-tn-surface border border-tn-border rounded-lg shadow-2xl py-1 min-w-[190px] text-[12px]"
        style={{ left: x, top: y }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

interface ContextMenuItemProps {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
}

export function ContextMenuItem({ label, shortcut, disabled, onClick }: ContextMenuItemProps) {
  return (
    <button
      className={`w-full text-left px-3 py-1.5 flex justify-between items-center gap-4 transition-colors ${
        disabled
          ? "text-tn-text-muted/30 cursor-default"
          : "text-tn-text hover:bg-tn-accent/15"
      }`}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onClick();
      }}
    >
      <span>{label}</span>
      {shortcut && <span className="text-tn-text-muted/50 text-[11px] font-mono shrink-0">{shortcut}</span>}
    </button>
  );
}

export function ContextMenuSeparator() {
  return <div className="border-t border-tn-border/60 my-1 mx-2" />;
}
