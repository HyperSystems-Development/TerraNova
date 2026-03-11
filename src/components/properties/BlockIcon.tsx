import React from "react";

/**
 * BlockIcon renders a PNG icon for a material/block, if available.
 *
 * @param {string} materialId - The material/block ID (e.g. "Ore_Adamantite")
 * @param {number} size - Icon size in px (default: 24)
 * @param {string} className - Optional extra className
 */
export function BlockIcon({ materialId, size = 24, className = "" }: {
  materialId: string;
  size?: number;
  className?: string;
}) {
  // Path to PNG icons (absolute Windows path, but for web use public/icons/)
  // You should copy PNGs to public/icons/ItemsGenerated/ for web usage
  const iconPath = `/icons/ItemsGenerated/${materialId}.png`;
  return (
    <img
      src={iconPath}
      alt={materialId}
      width={size}
      height={size}
      className={`block-icon ${className}`}
      style={{ objectFit: "contain", borderRadius: 4, border: "1px solid #222" }}
      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}
