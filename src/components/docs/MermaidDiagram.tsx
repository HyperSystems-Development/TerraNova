import { useEffect, useMemo, useRef } from "react";
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
      .then((result) => {
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = result.svg;
      })
      .catch((err) => {
        if (cancelled || !containerRef.current) return;
        const pre = document.createElement("pre");
        pre.style.color = "#f00";
        pre.style.fontSize = "11px";
        pre.textContent = `Mermaid render error: ${String(err)}`;
        containerRef.current.replaceChildren(pre);
      });

    return () => {
      cancelled = true;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [code, id]);

  return <div ref={containerRef} className="mermaid" />;
}
