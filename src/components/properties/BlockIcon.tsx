import { useEffect, useState } from "react";
import { resolveBlockIconUrl } from "@/utils/blockIconUrl";

/**
 * BlockIcon renders a PNG icon for a material/block, if available.
 *
 * @param materialId - The material/block ID (e.g. "Rock_Stone")
 * @param size - Icon size in px (default: 24)
 * @param className - Optional extra className
 */
export function BlockIcon({
  materialId,
  size = 24,
  className = "",
}: {
  materialId: string;
  size?: number;
  className?: string;
}) {
  const [iconSrc, setIconSrc] = useState(`/icons/ItemsGenerated/${materialId}.png`);

  useEffect(() => {
    let cancelled = false;
    void resolveBlockIconUrl(materialId).then((url) => {
      if (!cancelled) setIconSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [materialId]);

  return (
    <img
      src={iconSrc}
      alt={materialId}
      width={size}
      height={size}
      className={`block-icon ${className}`}
      style={{ objectFit: "contain", borderRadius: 4, border: "1px solid #222" }}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
