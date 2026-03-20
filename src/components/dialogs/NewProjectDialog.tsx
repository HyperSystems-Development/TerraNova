import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useTauriIO } from "@/hooks/useTauriIO";
import { BUNDLED_TEMPLATES } from "@/data/templates";

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
    const selected = await open({ directory: true, title: "Choose project location" });
    if (selected) {
      setTargetDir(typeof selected === "string" ? selected : selected);
    }
  }

  async function handleCreate() {
    if (!projectName.trim() || !targetDir) return;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-tn-panel border border-tn-border rounded-lg shadow-xl w-[520px] max-w-[calc(100vw-2rem)] p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
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
                className={`text-left px-3 py-2.5 rounded border text-sm transition-colors ${
                  selectedTemplate === t.name
                    ? "border-tn-accent bg-tn-accent/10"
                    : "border-tn-border bg-tn-bg hover:bg-tn-surface"
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium">{t.displayName}</span>
                  <span className="text-[11px] text-tn-text-muted">{t.category}</span>
                </div>
                <p className="text-xs text-tn-text-muted mt-1 leading-relaxed">{t.description}</p>
                {t.tags && t.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {t.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-tn-surface border border-tn-border text-tn-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-tn-border">
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
