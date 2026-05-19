import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useTauriIO } from "@/hooks/useTauriIO";
import { BUNDLED_TEMPLATES } from "@/data/templates";
import { isTauriRuntime } from "@/utils/platform";

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  defaultTemplate?: string;
}

export function NewProjectDialog({ open: isOpen, onClose, defaultTemplate }: NewProjectDialogProps) {
  const [projectName, setProjectName] = useState("");
  const [targetDir, setTargetDir] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createFromTemplate } = useTauriIO();
  const canUseNativeFileSystem = isTauriRuntime();

  useEffect(() => {
    if (isOpen) {
      setProjectName("");
      setTargetDir("");
      setSelectedTemplate(defaultTemplate ?? "");
      setCreating(false);
      setError(null);
    }
  }, [isOpen, defaultTemplate]);

  if (!isOpen) return null;

  async function handlePickDirectory() {
    if (!canUseNativeFileSystem) {
      setError("Project creation requires the TerraNova desktop app.");
      return;
    }

    try {
      const selected = await open({ directory: true, title: "Choose project location" });
      if (selected) {
        setTargetDir(typeof selected === "string" ? selected : selected);
        setError(null);
      }
    } catch (err) {
      setError(`Failed to choose project location: ${err}`);
    }
  }

  async function handleCreate() {
    if (!projectName.trim() || !targetDir) return;
    if (!canUseNativeFileSystem) {
      setError("Project creation requires the TerraNova desktop app.");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const fullPath = `${targetDir}/${projectName.trim()}`;
      await createFromTemplate(selectedTemplate, fullPath);
      onClose();
    } catch (err) {
      setError(`Failed to create project: ${err}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-tn-panel border border-tn-border rounded-lg shadow-xl w-[min(440px,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-4">
          <h2 className="text-base font-semibold">New Project</h2>

          {/* Project name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-tn-text-muted">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="my-world"
              className="px-2 py-1.5 text-sm bg-tn-bg border border-tn-border rounded focus:border-tn-accent outline-none"
              autoFocus
            />
          </div>

          {/* Directory picker */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-tn-text-muted">Location</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={targetDir}
                readOnly
                placeholder="Select a directory..."
                className="flex-1 px-2 py-1.5 text-sm bg-tn-bg border border-tn-border rounded text-tn-text-muted"
              />
              <button
                onClick={handlePickDirectory}
                className="px-3 py-1.5 text-sm bg-tn-surface border border-tn-border rounded hover:bg-tn-accent/20"
              >
                Browse
              </button>
            </div>
          </div>

          {/* Template selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-tn-text-muted">Template</label>
            <div className="flex flex-col gap-2">
              {BUNDLED_TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setSelectedTemplate(t.name)}
                  className={`text-left px-3 py-2 rounded border text-sm ${
                    selectedTemplate === t.name
                      ? "border-tn-accent bg-tn-accent/10"
                      : "border-tn-border bg-tn-bg hover:bg-tn-surface"
                  }`}
                >
                  <span className="font-medium">{t.displayName}</span>
                  <span className="ml-2 text-xs text-tn-text-muted">{t.category}</span>
                  <p className="text-xs text-tn-text-muted mt-0.5">{t.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Error display */}
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-tn-border shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm rounded border border-tn-border hover:bg-tn-surface"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!projectName.trim() || !targetDir || creating}
            className="px-4 py-1.5 text-sm rounded bg-tn-accent text-tn-bg font-medium disabled:opacity-50 hover:opacity-90"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
