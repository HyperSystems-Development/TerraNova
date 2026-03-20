use serde::{Deserialize, Serialize};
use serde_json::Value;

/// All 68 density function types in the V2 world generation system.
///
/// Density functions define 3D decimal value fields used for terrain shaping,
/// noise generation, mathematical operations, spatial transformations, and more.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "Type")]
pub enum DensityType {
    // ── Noise Generators ──────────────────────────────────────────────
    /// 2D simplex noise in the x/z plane, outputs [-1, 1].
    /// Automatically caches per x/z column.
    SimplexNoise2D {
        #[serde(rename = "Lacunarity", default)]
        lacunarity: Option<f64>,
        #[serde(rename = "Persistence", default)]
        persistence: Option<f64>,
        #[serde(rename = "Scale", default)]
        scale: Option<f64>,
        #[serde(rename = "Octaves", default)]
        octaves: Option<i32>,
        #[serde(rename = "Seed", default)]
        seed: Option<String>,
    },

    /// 3D simplex noise in x/y/z space, outputs [-1, 1].
    SimplexNoise3D {
        #[serde(rename = "Lacunarity", default)]
        lacunarity: Option<f64>,
        #[serde(rename = "Persistence", default)]
        persistence: Option<f64>,
        #[serde(rename = "ScaleXZ", default)]
        scale_xz: Option<f64>,
        #[serde(rename = "ScaleY", default)]
        scale_y: Option<f64>,
        #[serde(rename = "Octaves", default)]
        octaves: Option<i32>,
        #[serde(rename = "Seed", default)]
        seed: Option<String>,
    },

    /// 2D cell/Worley noise.
    CellNoise2D {
        #[serde(rename = "Scale", default)]
        scale: Option<f64>,
        #[serde(rename = "Seed", default)]
        seed: Option<String>,
        #[serde(rename = "ReturnType", default)]
        return_type: Option<String>,
        #[serde(rename = "DistanceFunction", default)]
        distance_function: Option<String>,
    },

    /// 3D cell/Worley noise.
    CellNoise3D {
        #[serde(rename = "Scale", default)]
        scale: Option<f64>,
        #[serde(rename = "Seed", default)]
        seed: Option<String>,
        #[serde(rename = "ReturnType", default)]
        return_type: Option<String>,
        #[serde(rename = "DistanceFunction", default)]
        distance_function: Option<String>,
    },

    // ── Constants & Basic Math ────────────────────────────────────────
    /// Outputs a constant value.
    Constant {
        #[serde(rename = "Value", default)]
        value: Option<f64>,
    },

    /// Output is the sum of all inputs.
    Sum {
        #[serde(rename = "Inputs", default)]
        inputs: Vec<Value>,
    },

    /// Output is the product of all inputs. Short-circuits on zero.
    Multiplier {
        #[serde(rename = "Inputs", default)]
        inputs: Vec<Value>,
    },

    /// Absolute value of the input.
    Abs {
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Multiplies input by -1.
    Inverter {
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Square root (modified for negative inputs).
    Sqrt {
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Input raised to the given exponent.
    Pow {
        #[serde(rename = "Exponent", default)]
        exponent: Option<f64>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Adds a constant offset to a density input.
    OffsetConstant {
        #[serde(rename = "Offset", default)]
        offset: Option<f64>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Multiplies a density input by a constant amplitude.
    AmplitudeConstant {
        #[serde(rename = "Amplitude", default)]
        amplitude: Option<f64>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    // ── Clamping & Limiting ──────────────────────────────────────────
    /// Hard clamp within [WallA, WallB].
    Clamp {
        #[serde(rename = "WallA", default)]
        wall_a: Option<f64>,
        #[serde(rename = "WallB", default)]
        wall_b: Option<f64>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Smooth clamp with configurable transition range.
    SmoothClamp {
        #[serde(rename = "WallA", default)]
        wall_a: Option<f64>,
        #[serde(rename = "WallB", default)]
        wall_b: Option<f64>,
        #[serde(rename = "Range", default)]
        range: Option<f64>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Hard floor on the input value.
    Floor {
        #[serde(rename = "Floor", default)]
        floor: Option<f64>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Smooth floor with transition range.
    SmoothFloor {
        #[serde(rename = "Floor", default)]
        floor: Option<f64>,
        #[serde(rename = "Range", default)]
        range: Option<f64>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Hard ceiling on the input value.
    Ceiling {
        #[serde(rename = "Ceiling", default)]
        ceiling: Option<f64>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Smooth ceiling with transition range.
    SmoothCeiling {
        #[serde(rename = "Ceiling", default)]
        ceiling: Option<f64>,
        #[serde(rename = "Range", default)]
        range: Option<f64>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    // ── Min/Max ──────────────────────────────────────────────────────
    /// Smallest value of all inputs.
    Min {
        #[serde(rename = "Inputs", default)]
        inputs: Vec<Value>,
    },

    /// Smoothed minimum between two inputs.
    SmoothMin {
        #[serde(rename = "Range", default)]
        range: Option<f64>,
        #[serde(rename = "Inputs", default)]
        inputs: Vec<Value>,
    },

    /// Greatest value of all inputs.
    Max {
        #[serde(rename = "Inputs", default)]
        inputs: Vec<Value>,
    },

    /// Smoothed maximum between two inputs.
    SmoothMax {
        #[serde(rename = "Range", default)]
        range: Option<f64>,
        #[serde(rename = "Inputs", default)]
        inputs: Vec<Value>,
    },

    // ── Mapping & Normalization ──────────────────────────────────────
    /// Rescales from [FromMin,FromMax] to [ToMin,ToMax].
    Normalizer {
        #[serde(rename = "FromMin", default)]
        from_min: Option<f64>,
        #[serde(rename = "FromMax", default)]
        from_max: Option<f64>,
        #[serde(rename = "ToMin", default)]
        to_min: Option<f64>,
        #[serde(rename = "ToMax", default)]
        to_max: Option<f64>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Maps input through a Curve asset.
    CurveMapper {
        #[serde(rename = "Curve", default)]
        curve: Option<Value>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Adds a density-driven offset to the input.
    Offset {
        #[serde(rename = "Offset", default)]
        offset: Option<Value>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Multiplies the input by a density-driven amplitude.
    Amplitude {
        #[serde(rename = "Amplitude", default)]
        amplitude: Option<Value>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    // ── Mixing ───────────────────────────────────────────────────────
    /// Mixes two density fields using a gauge (0..1).
    Mix {
        #[serde(rename = "Inputs", default)]
        inputs: Vec<Value>,
    },

    /// Mixes multiple density fields using keys and a gauge.
    MultiMix {
        #[serde(rename = "Keys", default)]
        keys: Vec<Value>,
        #[serde(rename = "Inputs", default)]
        inputs: Vec<Value>,
    },

    // ── Spatial Transforms ───────────────────────────────────────────
    /// Stretches/contracts the input field per axis.
    Scale {
        #[serde(rename = "X", default)]
        x: Option<f64>,
        #[serde(rename = "Y", default)]
        y: Option<f64>,
        #[serde(rename = "Z", default)]
        z: Option<f64>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Slides the input field by a vector.
    Slider {
        #[serde(rename = "SlideX", default)]
        slide_x: Option<f64>,
        #[serde(rename = "SlideY", default)]
        slide_y: Option<f64>,
        #[serde(rename = "SlideZ", default)]
        slide_z: Option<f64>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Rotates the input field by aligning Y-axis and spinning.
    Rotator {
        #[serde(rename = "NewYAxis", default)]
        new_y_axis: Option<Value>,
        #[serde(rename = "X", default)]
        x: Option<f64>,
        #[serde(rename = "Y", default)]
        y: Option<f64>,
        #[serde(rename = "Z", default)]
        z: Option<f64>,
        #[serde(rename = "SpinAngle", default)]
        spin_angle: Option<f64>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Anchors the child field's origin to a contextual anchor point.
    Anchor {
        #[serde(rename = "Reverse", default)]
        reverse: Option<bool>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Overrides the X coordinate the input sees.
    XOverride {
        #[serde(rename = "Input", default)]
        input: Option<Value>,
        #[serde(rename = "Override", default)]
        override_value: Option<Value>,
    },

    /// Overrides the Y coordinate the input sees.
    YOverride {
        #[serde(rename = "Input", default)]
        input: Option<Value>,
        #[serde(rename = "Override", default)]
        override_value: Option<Value>,
    },

    /// Overrides the Z coordinate the input sees.
    ZOverride {
        #[serde(rename = "Input", default)]
        input: Option<Value>,
        #[serde(rename = "Override", default)]
        override_value: Option<Value>,
    },

    // ── Warping ──────────────────────────────────────────────────────
    /// Gradient-based warp using a second density field.
    GradientWarp {
        #[serde(rename = "SampleRange", default)]
        sample_range: Option<f64>,
        #[serde(rename = "WarpFactor", default)]
        warp_factor: Option<f64>,
        #[serde(rename = "2D", default)]
        is_2d: Option<bool>,
        #[serde(rename = "YFor2D", default)]
        y_for_2d: Option<f64>,
        #[serde(rename = "Inputs", default)]
        inputs: Vec<Value>,
    },

    /// Fast gradient warp using an internal simplex noise generator.
    FastGradientWarp {
        #[serde(rename = "WarpScale", default)]
        warp_scale: Option<f64>,
        #[serde(rename = "WarpLacunarity", default)]
        warp_lacunarity: Option<f64>,
        #[serde(rename = "WarpPersistence", default)]
        warp_persistence: Option<f64>,
        #[serde(rename = "WarpOctaves", default)]
        warp_octaves: Option<i32>,
        #[serde(rename = "WarpFactor", default)]
        warp_factor: Option<f64>,
        #[serde(rename = "Seed", default)]
        seed: Option<String>,
        #[serde(rename = "2D", default)]
        is_2d: Option<bool>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Warps input along a vector direction by the second density field.
    VectorWarp {
        #[serde(rename = "WarpFactor", default)]
        warp_factor: Option<f64>,
        #[serde(rename = "WarpVector", default)]
        warp_vector: Option<Value>,
        #[serde(rename = "X", default)]
        x: Option<f64>,
        #[serde(rename = "Y", default)]
        y: Option<f64>,
        #[serde(rename = "Z", default)]
        z: Option<f64>,
        #[serde(rename = "Inputs", default)]
        inputs: Vec<Value>,
    },

    // ── Shapes ───────────────────────────────────────────────────────
    /// Density from distance to origin using a Curve.
    Distance {
        #[serde(rename = "Curve", default)]
        curve: Option<Value>,
    },

    /// Cube shape: density from distance to origin axis.
    Cube {
        #[serde(rename = "Curve", default)]
        curve: Option<Value>,
    },

    /// Deformed sphere with per-axis scale and rotation.
    Ellipsoid {
        #[serde(rename = "Curve", default)]
        curve: Option<Value>,
        #[serde(rename = "Scale", default)]
        scale: Option<Value>,
        #[serde(rename = "X", default)]
        x: Option<f64>,
        #[serde(rename = "Y", default)]
        y: Option<f64>,
        #[serde(rename = "Z", default)]
        z: Option<f64>,
        #[serde(rename = "Spin", default)]
        spin: Option<f64>,
    },

    /// Deformed cube with per-axis scale and rotation.
    Cuboid {
        #[serde(rename = "Curve", default)]
        curve: Option<Value>,
        #[serde(rename = "Scale", default)]
        scale: Option<Value>,
        #[serde(rename = "X", default)]
        x: Option<f64>,
        #[serde(rename = "Y", default)]
        y: Option<f64>,
        #[serde(rename = "Z", default)]
        z: Option<f64>,
        #[serde(rename = "Spin", default)]
        spin: Option<f64>,
        #[serde(rename = "NewYAxis", default)]
        new_y_axis: Option<Value>,
    },

    /// Cylindrical shape with axial and radial curves.
    Cylinder {
        #[serde(rename = "AxialCurve", default)]
        axial_curve: Option<Value>,
        #[serde(rename = "RadialCurve", default)]
        radial_curve: Option<Value>,
        #[serde(rename = "Spin", default)]
        spin: Option<f64>,
        #[serde(rename = "NewYAxis", default)]
        new_y_axis: Option<Value>,
    },

    /// Density from distance to a plane through the origin.
    Plane {
        #[serde(rename = "PlaneNormal", default)]
        plane_normal: Option<Value>,
        #[serde(rename = "X", default)]
        x: Option<f64>,
        #[serde(rename = "Y", default)]
        y: Option<f64>,
        #[serde(rename = "Z", default)]
        z: Option<f64>,
        #[serde(rename = "Curve", default)]
        curve: Option<Value>,
    },

    /// Density from distance to an axis line through the origin.
    Axis {
        #[serde(rename = "Axis", default)]
        axis: Option<Value>,
        #[serde(rename = "X", default)]
        x: Option<f64>,
        #[serde(rename = "Y", default)]
        y: Option<f64>,
        #[serde(rename = "Z", default)]
        z: Option<f64>,
        #[serde(rename = "Curve", default)]
        curve: Option<Value>,
        #[serde(rename = "IsAnchored", default)]
        is_anchored: Option<bool>,
    },

    /// Shell shape defined by angle and distance curves.
    Shell {
        #[serde(rename = "Axis", default)]
        axis: Option<Value>,
        #[serde(rename = "X", default)]
        x: Option<f64>,
        #[serde(rename = "Y", default)]
        y: Option<f64>,
        #[serde(rename = "Z", default)]
        z: Option<f64>,
        #[serde(rename = "Mirror", default)]
        mirror: Option<bool>,
        #[serde(rename = "AngleCurve", default)]
        angle_curve: Option<Value>,
        #[serde(rename = "DistanceCurve", default)]
        distance_curve: Option<Value>,
    },

    /// Angle in degrees between two vectors.
    Angle {
        #[serde(rename = "Vector", default)]
        vector: Option<Value>,
        #[serde(rename = "VectorProvider", default)]
        vector_provider: Option<Value>,
    },

    // ── Coordinate Accessors ─────────────────────────────────────────
    /// The local X coordinate.
    XValue {},

    /// The local Y coordinate.
    YValue {},

    /// The local Z coordinate.
    ZValue {},

    // ── World Context ────────────────────────────────────────────────
    /// The world's interpolated terrain density (for MaterialProvider use).
    Terrain {},

    /// Reference a BaseHeight from the WorldStructure.
    BaseHeight {
        #[serde(rename = "BaseHeightName", default)]
        base_height_name: Option<String>,
        #[serde(rename = "Distance", default)]
        distance: Option<bool>,
    },

    /// Distance to the nearest cell wall in a cell noise field.
    CellWallDistance {
        #[serde(rename = "Positions", default)]
        positions: Option<Value>,
        #[serde(rename = "MaxDistance", default)]
        max_distance: Option<f64>,
    },

    /// Distance to the nearest biome edge in blocks.
    DistanceToBiomeEdge {},

    /// Linear gradient density field.
    Gradient {
        #[serde(rename = "From", default)]
        from: Option<f64>,
        #[serde(rename = "To", default)]
        to: Option<f64>,
        #[serde(rename = "FromY", default)]
        from_y: Option<f64>,
        #[serde(rename = "ToY", default)]
        to_y: Option<f64>,
    },

    // ── Caching ──────────────────────────────────────────────────────
    /// Caches input for current 3D coordinates.
    Cache {
        #[serde(rename = "Capacity", default)]
        capacity: Option<i32>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Caches input per x/z column (2D cache).
    Cache2D {
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Samples input at a fixed Y, caching per x/z.
    YSampled {
        #[serde(rename = "Y", default)]
        y: Option<f64>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    // ── Switching ────────────────────────────────────────────────────
    /// Switches between density branches based on contextual state.
    Switch {
        #[serde(rename = "SwitchCases", default)]
        switch_cases: Vec<Value>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Sets the contextual switch state for downstream branches.
    SwitchState {
        #[serde(rename = "SwitchState", default)]
        switch_state: Option<String>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    // ── Positions-Based ──────────────────────────────────────────────
    /// Cell noise driven by a Positions field with configurable return types.
    PositionsCellNoise {
        #[serde(rename = "Positions", default)]
        positions: Option<Value>,
        #[serde(rename = "ReturnType", default)]
        return_type: Option<Value>,
        #[serde(rename = "DistanceFunction", default)]
        distance_function: Option<Value>,
        #[serde(rename = "MaxDistance", default)]
        max_distance: Option<f64>,
    },

    /// 3D positions-based density provider.
    Positions3D {
        #[serde(rename = "Positions", default)]
        positions: Option<Value>,
        #[serde(rename = "Density", default)]
        density: Option<Value>,
        #[serde(rename = "MaxDistance", default)]
        max_distance: Option<f64>,
    },

    /// Pinches or expands a density field around position points.
    PositionsPinch {
        #[serde(rename = "Positions", default)]
        positions: Option<Value>,
        #[serde(rename = "PinchCurve", default)]
        pinch_curve: Option<Value>,
        #[serde(rename = "MaxDistance", default)]
        max_distance: Option<f64>,
        #[serde(rename = "NormalizeDistance", default)]
        normalize_distance: Option<bool>,
        #[serde(rename = "HorizontalPinch", default)]
        horizontal_pinch: Option<bool>,
        #[serde(rename = "PositionsMaxY", default)]
        positions_max_y: Option<f64>,
        #[serde(rename = "PositionsMinY", default)]
        positions_min_y: Option<f64>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Twists a density field around position points.
    PositionsTwist {
        #[serde(rename = "Positions", default)]
        positions: Option<Value>,
        #[serde(rename = "TwistCurve", default)]
        twist_curve: Option<Value>,
        #[serde(rename = "TwistAxis", default)]
        twist_axis: Option<Value>,
        #[serde(rename = "X", default)]
        x: Option<f64>,
        #[serde(rename = "Y", default)]
        y: Option<f64>,
        #[serde(rename = "Z", default)]
        z: Option<f64>,
        #[serde(rename = "MaxDistance", default)]
        max_distance: Option<f64>,
        #[serde(rename = "NormalizeDistance", default)]
        normalize_distance: Option<bool>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    // ── Import/Export ────────────────────────────────────────────────
    /// Exports a density field for reuse (optionally as a single instance).
    Exported {
        #[serde(rename = "SingleInstance", default)]
        single_instance: Option<bool>,
        #[serde(rename = "Density", default)]
        density: Option<Value>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },

    /// Imports a previously exported density field by name.
    Imported {
        #[serde(rename = "Name", default)]
        name: Option<String>,
    },

    /// Pipeline density node for chaining operations.
    Pipeline {
        #[serde(rename = "Steps", default)]
        steps: Vec<Value>,
        #[serde(rename = "Input", default)]
        input: Option<Value>,
    },
}
