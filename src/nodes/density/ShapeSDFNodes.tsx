import { memo } from "react";
import { AssetCategory } from "@/schema/types";
import { BaseNode, type TypedNodeProps } from "../shared/BaseNode";
import { curveInput, densityOutput } from "../shared/handles";
import { SchemaFields } from "../shared/SchemaFields";

const SINGLE_CURVE_SDF_HANDLES = [curveInput("Curve", "Curve"), densityOutput()];
const CYLINDER_HANDLES = [curveInput("RadialCurve", "Radial Curve"), curveInput("AxialCurve", "Axial Curve"), densityOutput()];
const SHELL_HANDLES = [curveInput("AngleCurve", "Angle Curve"), curveInput("DistanceCurve", "Distance Curve"), densityOutput()];
const CURVE_INPUT_HANDLES = [curveInput("Curve", "Curve"), densityOutput()];

export const EllipsoidNode = memo(function EllipsoidNode(props: TypedNodeProps) {
  const data = props.data;
  // V2 schema: Scale (vec3), NewYAxis (vec3), Spin (number). Legacy: Radius (vec3).
  const hasV2Fields = data.fields.Scale != null;
  if (hasV2Fields) {
    return (
      <BaseNode {...props} category={AssetCategory.Density} handles={SINGLE_CURVE_SDF_HANDLES}>
        <SchemaFields typeKey="Ellipsoid" fields={data.fields} />
      </BaseNode>
    );
  }
  const r = data.fields.Radius as { x?: number; y?: number; z?: number } | undefined;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={SINGLE_CURVE_SDF_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Radius</span>
        <span>{Number(r?.x ?? 1).toFixed(1)}, {Number(r?.y ?? 1).toFixed(1)}, {Number(r?.z ?? 1).toFixed(1)}</span>
      </div>
    </BaseNode>
  );
});

export const CuboidNode = memo(function CuboidNode(props: TypedNodeProps) {
  const data = props.data;
  // V2 schema: Min (vec3i), Max (vec3i). Legacy: Size (vec3).
  const hasV2Fields = data.fields.Min != null || data.fields.Max != null;
  if (hasV2Fields) {
    return (
      <BaseNode {...props} category={AssetCategory.Density} handles={SINGLE_CURVE_SDF_HANDLES}>
        <SchemaFields typeKey="Cuboid" fields={data.fields} />
      </BaseNode>
    );
  }
  const s = data.fields.Size as { x?: number; y?: number; z?: number } | undefined;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={SINGLE_CURVE_SDF_HANDLES}>
      <div className="flex justify-between">
        <span className="text-tn-text-muted">Size</span>
        <span>{Number(s?.x ?? 1).toFixed(1)}, {Number(s?.y ?? 1).toFixed(1)}, {Number(s?.z ?? 1).toFixed(1)}</span>
      </div>
    </BaseNode>
  );
});

export const CylinderNode = memo(function CylinderNode(props: TypedNodeProps) {
  const data = props.data;
  // V2 schema: NewYAxis (vec3), Spin (number). Legacy: Radius, Height.
  const hasV2Fields = data.fields.NewYAxis != null || data.fields.Spin != null;
  if (hasV2Fields) {
    return (
      <BaseNode {...props} category={AssetCategory.Density} handles={CYLINDER_HANDLES}>
        <SchemaFields typeKey="Cylinder" fields={data.fields} />
      </BaseNode>
    );
  }
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={CYLINDER_HANDLES}>
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Radius</span>
          <span>{Number(data.fields.Radius ?? 1).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Height</span>
          <span>{Number(data.fields.Height ?? 2).toFixed(2)}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const PlaneNode = memo(function PlaneNode(props: TypedNodeProps) {
  const data = props.data;
  // V2 schema: PlaneNormal (vec3), IsAnchored (boolean). Legacy: Normal (vec3), IsAnchored.
  const hasV2Fields = data.fields.PlaneNormal != null;
  if (hasV2Fields) {
    return (
      <BaseNode {...props} category={AssetCategory.Density} handles={SINGLE_CURVE_SDF_HANDLES}>
        <SchemaFields typeKey="Plane" fields={data.fields} />
      </BaseNode>
    );
  }
  const n = data.fields.Normal as { x?: number; y?: number; z?: number } | undefined;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={SINGLE_CURVE_SDF_HANDLES}>
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Normal</span>
          <span>{Number(n?.x ?? 0).toFixed(1)}, {Number(n?.y ?? 1).toFixed(1)}, {Number(n?.z ?? 0).toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Anchored</span>
          <span>{data.fields.IsAnchored ? "Yes" : "No"}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const ShellNode = memo(function ShellNode(props: TypedNodeProps) {
  const data = props.data;
  // V2 schema: Axis (vec3), Mirror (boolean). Legacy: InnerRadius, OuterRadius.
  const hasV2Fields = data.fields.Mirror != null || (data.fields.Axis != null && data.fields.InnerRadius == null);
  if (hasV2Fields) {
    return (
      <BaseNode {...props} category={AssetCategory.Density} handles={SHELL_HANDLES}>
        <SchemaFields typeKey="Shell" fields={data.fields} />
      </BaseNode>
    );
  }
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={SHELL_HANDLES}>
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Inner R</span>
          <span>{Number(data.fields.InnerRadius ?? 0.5).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-tn-text-muted">Outer R</span>
          <span>{Number(data.fields.OuterRadius ?? 1).toFixed(2)}</span>
        </div>
      </div>
    </BaseNode>
  );
});

export const CubeSDFNode = memo(function CubeSDFNode(props: TypedNodeProps) {
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={CURVE_INPUT_HANDLES}>
      <div className="text-tn-text-muted text-center py-1">Cube SDF</div>
    </BaseNode>
  );
});

export const AxisNode = memo(function AxisNode(props: TypedNodeProps) {
  const data = props.data;
  return (
    <BaseNode {...props} category={AssetCategory.Density} handles={CURVE_INPUT_HANDLES}>
      <SchemaFields typeKey="Axis" fields={data.fields} />
    </BaseNode>
  );
});
