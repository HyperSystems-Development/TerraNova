import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { useToastStore } from "@/stores/toastStore";

export async function exportCanvasAsPNG(canvas: HTMLCanvasElement): Promise<string | null> {
  const filePath = await save({
    filters: [{ name: "PNG Image", extensions: ["png"] }],
  });
  if (!filePath) return null;

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("Failed to create image blob");
  const buffer = await blob.arrayBuffer();
  await writeFile(filePath, new Uint8Array(buffer));
  return filePath;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function exportPreviewCanvas(canvas: HTMLCanvasElement | null | undefined): Promise<boolean> {
  const addToast = useToastStore.getState().addToast;

  if (!canvas) {
    addToast("No preview canvas is ready to export yet.", "warning");
    return false;
  }

  try {
    const filePath = await exportCanvasAsPNG(canvas);
    if (!filePath) return false;
    addToast(`Exported PNG to ${filePath}`, "success");
    return true;
  } catch (error) {
    if (import.meta.env.DEV) console.error("Export PNG failed:", error);
    addToast(`Export PNG failed: ${getErrorMessage(error)}`, "error");
    return false;
  }
}
