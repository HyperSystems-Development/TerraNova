import { useId, useRef, useState, useEffect } from "react";
import { FieldTooltip } from "./FieldTooltip";
import { HYTALE_MATERIAL_IDS, getMaterialColor, findNearestMaterials } from "@/utils/materialResolver";
import { BlockIcon } from "./BlockIcon";

interface MaterialFieldProps {
  label: string;
  value: string;
  description?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

const MAX_DROPDOWN = 80;

export function MaterialField({ label, value, description, onChange, onBlur }: MaterialFieldProps) {
  const colorPickerId = useId();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [category, setCategory] = useState("All");
  const [palettePreview, setPalettePreview] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Material categories (prefixes)
  const MATERIAL_CATEGORIES = ["All", "Rock", "Soil", "Plant", "Wood", "Ore", "Fluid", "Rubble", "Barrier", "Deco", "Furniture"];

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const filtered = query.trim() === ""
    ? HYTALE_MATERIAL_IDS.filter(id => category === "All" || id.startsWith(category)).slice(0, MAX_DROPDOWN)
    : HYTALE_MATERIAL_IDS.filter(id =>
        (category === "All" || id.startsWith(category)) && id.toLowerCase().includes(query.toLowerCase())
      ).slice(0, MAX_DROPDOWN);

  function commit(id: string) {
    setQuery(id);
    onChange(id);
    setOpen(false);
    onBlur?.();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setActiveIdx(0);
    setOpen(true);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") { setOpen(true); e.preventDefault(); }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIdx]) commit(filtered[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(value); // revert
    }
  }

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

  function handleColorPick(e: React.ChangeEvent<HTMLInputElement>) {
    const preview = findNearestMaterials(e.target.value, category, 5);
    setPalettePreview(preview);
  }

  const swatchColor = getMaterialColor(value);

  return (
    <div ref={containerRef} className="flex flex-col gap-1">
      <label className="text-xs text-tn-text-muted flex items-center">
        {label}
        {description && <FieldTooltip description={description} />}
      </label>

      <div className="flex items-center gap-1.5">
        {/* PNG icon and color swatch for current material */}
        <BlockIcon materialId={value} size={24} className="mr-1" />
        <div
          className="w-5 h-5 shrink-0 rounded border border-tn-border/80"
          style={{ backgroundColor: swatchColor ?? "#444" }}
          title={swatchColor ?? "Unknown"}
        />

        {/* Text input */}
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setTimeout(() => {
              if (!containerRef.current?.matches(":focus-within")) {
                setOpen(false);
                if (!HYTALE_MATERIAL_IDS.includes(query)) setQuery(value);
                else onBlur?.();
              }
            }, 150);
          }}
          className="flex-1 px-2 py-1 text-sm bg-tn-bg border border-tn-border rounded min-w-0"
          autoComplete="off"
          spellCheck={false}
        />

        {/* Category filter */}
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="px-1 py-1 text-xs rounded border border-tn-border bg-tn-bg text-tn-text-muted"
          style={{ minWidth: 80 }}
        >
          {MATERIAL_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>


        {/* Color picker styled as TerraNova panel button */}
        <button
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded border border-tn-border bg-tn-panel hover:bg-tn-accent/10 cursor-pointer transition"
          title="Pick by color — shows closest matching blocks"
          style={{ position: 'relative', overflow: 'hidden' }}
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4 text-tn-text-muted" fill="currentColor">
            <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-1 1a.5.5 0 0 1-.708 0L13 3.707l-9.5 9.5A1.5 1.5 0 0 1 2.44 13.5H1.5a1 1 0 0 1-1-1v-.94a1.5 1.5 0 0 1 .44-1.06l9.5-9.5L9.293 3.854a.5.5 0 0 1 0-.708l1-1a.5.5 0 0 1 .707 0l.146.146z"/>
          </svg>
          <input
            id={colorPickerId}
            type="color"
            defaultValue={swatchColor ?? "#909090"}
            onChange={handleColorPick}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            tabIndex={-1}
          />
        </button>
      </div>

      {/* Palette preview — show top N matches from color picker as horizontal row with names in box */}
      {palettePreview.length > 0 && (
        <div className="flex flex-col gap-4 mt-2">
          <div className="mb-1 text-xs font-semibold text-tn-text-muted">Palette Preview: Closest Materials</div>
          {palettePreview.map(id => (
            <button
              key={id}
              onClick={() => commit(id)}
              className="flex flex-row items-center px-4 py-2 rounded border border-tn-border bg-tn-panel hover:bg-tn-accent/10"
              style={{ minWidth: 120, height: 56 }}
            >
              <BlockIcon materialId={id} size={24} />
              <span className="w-6 h-6 rounded border border-tn-border mx-3" style={{ backgroundColor: getMaterialColor(id) ?? '#444' }} />
              <span className="text-[14px] truncate text-center" style={{ fontWeight: 500 }}>{id}</span>
            </button>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-64 max-h-52 overflow-y-auto bg-tn-panel border border-tn-border rounded shadow-lg text-sm"
          style={{ marginTop: "0px" }}
          onMouseDown={e => e.preventDefault()} // prevent blur before click
        >
          {filtered.map((id, i) => {
            const color = getMaterialColor(id);
            return (
              <li
                key={id}
                onMouseDown={() => commit(id)}
                onMouseEnter={() => setActiveIdx(i)}
                className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer ${
                  i === activeIdx ? "bg-tn-accent/20" : "hover:bg-white/[0.04]"
                }`}
              >
                <BlockIcon materialId={id} size={20} className="mr-1" />
                <span
                  className="w-3.5 h-3.5 shrink-0 rounded-sm border border-tn-border/60"
                  style={{ backgroundColor: color ?? "#444" }}
                />
                <span className="truncate text-[12px]">{id}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
