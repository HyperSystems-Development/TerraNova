import { memo } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { usePreviewStore } from "@/stores/previewStore";

// ---------------------------------------------------------------------------
// PipelineIndicator
// A read-only strip showing the worldgen pipeline order.
// Clicking a step switches to the relevant editing context when possible.
// ---------------------------------------------------------------------------

interface Step {
  key: string;
  label: string;
  context?: string; // editorStore editingContext value to switch to
}

const STEPS: Step[] = [
  { key: "density",      label: "Density" },
  { key: "terrain",      label: "Terrain" },
  { key: "materials",    label: "Materials" },
  { key: "props",        label: "Props" },
  { key: "atmosphere",   label: "Atmosphere" },
];

function getActiveStep(context: string | null, biomeSection: string | null | undefined): string {
  if (!context) return "";
  if (context === "Density") return "density";
  if (context === "Biome") {
    if (!biomeSection || biomeSection === "Terrain") return "terrain";
    if (biomeSection === "MaterialProvider") return "materials";
    if (biomeSection?.startsWith("Props[")) return "props";
    return "terrain";
  }
  return "";
}

export const PipelineIndicator = memo(function PipelineIndicator() {
  const editingContext  = useEditorStore((s) => s.editingContext);
  const biomeSection    = useEditorStore((s) => s.activeBiomeSection);
  const switchSection   = useEditorStore((s) => s.switchBiomeSection);
  const setViewMode     = usePreviewStore((s) => s.setViewMode);

  const activeStep = getActiveStep(editingContext, biomeSection);

  function handleClick(step: Step) {
    if (step.key === "terrain") {
      switchSection("Terrain");
    } else if (step.key === "materials") {
      switchSection("MaterialProvider");
    } else if (step.key === "props") {
      switchSection("Props[0]");
    } else if (step.key === "atmosphere") {
      // Switch to preview so the atmosphere controls in the inspector are visible
      setViewMode("preview");
    }
    // density: no action — density graph opens via file browser
  }

  return (
    <div className="flex items-center h-7 px-3 bg-tn-bg border-b border-tn-border shrink-0 gap-0 select-none overflow-x-auto">
      {STEPS.map((step, i) => {
        const isActive = step.key === activeStep;
        return (
          <div key={step.key} className="flex items-center shrink-0">
            <button
              onClick={() => handleClick(step)}
              title={`Go to ${step.label}`}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                isActive
                  ? "text-tn-accent bg-tn-accent/10"
                  : "text-tn-text-muted hover:text-tn-text hover:bg-white/5"
              }`}
            >
              {step.label}
            </button>
            {i < STEPS.length - 1 && (
              <span className="text-[10px] text-tn-border mx-0.5">→</span>
            )}
          </div>
        );
      })}
    </div>
  );
});
