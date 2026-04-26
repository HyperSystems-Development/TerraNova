import { useState } from "react";
import { HelpCircle } from "lucide-react";

interface HelpTooltipProps {
  content: string;
  className?: string;
}

export function HelpTooltip({ content, className = "" }: HelpTooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <button
        className="w-4 h-4 flex items-center justify-center text-tn-text-muted hover:text-tn-accent transition-colors"
        aria-label="Help"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-tn-surface border border-tn-border rounded-md shadow-lg p-3 z-50">
          <p className="text-xs text-tn-text leading-relaxed">{content}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-tn-surface" />
        </div>
      )}
    </div>
  );
}
