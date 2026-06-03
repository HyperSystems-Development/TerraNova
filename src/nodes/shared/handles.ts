import { AssetCategory, CATEGORY_COLORS } from "@/schema/types";

export interface HandleDef {
  id: string;
  label: string;
  type: "source" | "target";
  category: AssetCategory;
}

/** Grey color used for all input (target) handles */
export const INPUT_HANDLE_COLOR = "#8C8878";

export function getHandleColor(category: AssetCategory): string {
  return CATEGORY_COLORS[category] ?? "#8C8878";
}

// Generic factory

export function categoryInput(id: string, label: string, category: AssetCategory): HandleDef {
  return { id, label, type: "target", category };
}

export function categoryOutput(id: string, label: string, category: AssetCategory): HandleDef {
  return { id, label, type: "source", category };
}

// Category-specific convenience functions

export function densityInput(id: string, label: string): HandleDef {
  return { id, label, type: "target", category: AssetCategory.Density };
}
export function densityOutput(id = "output", label = "Output"): HandleDef {
  return { id, label, type: "source", category: AssetCategory.Density };
}

export function curveInput(id: string, label: string): HandleDef {
  return { id, label, type: "target", category: AssetCategory.Curve };
}
export function curveOutput(id = "output", label = "Output"): HandleDef {
  return { id, label, type: "source", category: AssetCategory.Curve };
}

export function materialInput(id: string, label: string): HandleDef {
  return { id, label, type: "target", category: AssetCategory.MaterialProvider };
}
export function materialOutput(id = "output", label = "Output"): HandleDef {
  return { id, label, type: "source", category: AssetCategory.MaterialProvider };
}

export function patternInput(id: string, label: string): HandleDef {
  return { id, label, type: "target", category: AssetCategory.Pattern };
}
export function patternOutput(id = "output", label = "Output"): HandleDef {
  return { id, label, type: "source", category: AssetCategory.Pattern };
}

export function conditionInput(id: string, label: string): HandleDef {
  return { id, label, type: "target", category: AssetCategory.Condition };
}

export function positionInput(id: string, label: string): HandleDef {
  return { id, label, type: "target", category: AssetCategory.PositionProvider };
}
export function positionOutput(id = "output", label = "Output"): HandleDef {
  return { id, label, type: "source", category: AssetCategory.PositionProvider };
}

export function scannerInput(id: string, label: string): HandleDef {
  return { id, label, type: "target", category: AssetCategory.Scanner };
}
export function scannerOutput(id = "output", label = "Output"): HandleDef {
  return { id, label, type: "source", category: AssetCategory.Scanner };
}

export function assignmentInput(id: string, label: string): HandleDef {
  return { id, label, type: "target", category: AssetCategory.Assignment };
}
export function assignmentOutput(id = "output", label = "Output"): HandleDef {
  return { id, label, type: "source", category: AssetCategory.Assignment };
}

export function vectorInput(id: string, label: string): HandleDef {
  return { id, label, type: "target", category: AssetCategory.VectorProvider };
}
export function vectorOutput(id = "output", label = "Output"): HandleDef {
  return { id, label, type: "source", category: AssetCategory.VectorProvider };
}

export function propInput(id: string, label: string): HandleDef {
  return { id, label, type: "target", category: AssetCategory.Prop };
}
export function propOutput(id = "output", label = "Output"): HandleDef {
  return { id, label, type: "source", category: AssetCategory.Prop };
}

export function environmentInput(id: string, label: string): HandleDef {
  return { id, label, type: "target", category: AssetCategory.EnvironmentProvider };
}
export function environmentOutput(id = "output", label = "Output"): HandleDef {
  return { id, label, type: "source", category: AssetCategory.EnvironmentProvider };
}

export function tintInput(id: string, label: string): HandleDef {
  return { id, label, type: "target", category: AssetCategory.TintProvider };
}
export function tintOutput(id = "output", label = "Output"): HandleDef {
  return { id, label, type: "source", category: AssetCategory.TintProvider };
}

export function blockMaskInput(id: string, label: string): HandleDef {
  return { id, label, type: "target", category: AssetCategory.BlockMask };
}
export function blockMaskOutput(id = "output", label = "Output"): HandleDef {
  return { id, label, type: "source", category: AssetCategory.BlockMask };
}

export function directionalityInput(id: string, label: string): HandleDef {
  return { id, label, type: "target", category: AssetCategory.Directionality };
}
export function directionalityOutput(id = "output", label = "Output"): HandleDef {
  return { id, label, type: "source", category: AssetCategory.Directionality };
}

// Shared density handle presets

export const DENSITY_INPUT_OUTPUT: HandleDef[] = [densityInput("Input", "Input"), densityOutput()];
export const DENSITY_OUTPUT_ONLY: HandleDef[] = [densityOutput()];
export const DENSITY_AB_INPUTS: HandleDef[] = [densityInput("Inputs[0]", "Input"), densityInput("Inputs[1]", "Input"), densityOutput()];
export const DENSITY_TWO_INPUTS: HandleDef[] = [densityInput("Inputs[0]", "Input 0"), densityInput("Inputs[1]", "Input 1"), densityOutput()];
