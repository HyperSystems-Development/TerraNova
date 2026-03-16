import React, { useEffect, useMemo, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "default" });

export function MermaidDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Stable ID for mermaid rendering
  const id = useMemo(() => `mermaid-${Math.random().toString(16).slice(2)}`, []);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    mermaid
      .render(id, code)
      .then((svg) => {
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = svg;
      })
      .catch((err) => {
        if (!containerRef.current) return;
        containerRef.current.innerHTML = `<pre style="color: #f00; font-size: 11px;">Mermaid render error: ${String(
          err,
        )}</pre>`;
      });

    return () => {
      cancelled = true;
    };
  }, [code, id]);

  return <div ref={containerRef} className="mermaid" />;
}
