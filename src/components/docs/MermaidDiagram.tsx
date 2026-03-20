import { useEffect, useMemo, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "default" });

export function MermaidDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Stable ID for mermaid rendering
  const id = useMemo(() => `mermaid-${Math.random().toString(16).slice(2)}`, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    mermaid
      .render(id, code)
      .then((result) => {
        if (cancelled) return;
        container.innerHTML = result.svg;
      })
      .catch((err) => {
        container.innerHTML = `<pre style="color: #f00; font-size: 11px;">Mermaid render error: ${String(
          err,
        )}</pre>`;
      });

    return () => {
      cancelled = true;
      container.innerHTML = "";
    };
  }, [code, id]);

  return <div ref={containerRef} className="mermaid" />;
}
