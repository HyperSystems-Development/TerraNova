#![allow(dead_code)]

pub mod assignments;
pub mod biome;
pub mod block_masks;
pub mod curves;
pub mod density;
pub mod environment;
pub mod framework;
pub mod material;
pub mod patterns;
pub mod positions;
pub mod props;
pub mod scanners;
pub mod settings;
#[cfg(test)]
mod tests;
pub mod validation;
pub mod vectors;
pub mod world_structure;

use serde::{Deserialize, Serialize};

/// Common base fields shared by most V2 asset types.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct BaseFields {
    /// The polymorphic type discriminator.
    #[serde(rename = "Type")]
    pub asset_type: String,

    /// If true, this asset is skipped during evaluation.
    #[serde(rename = "Skip")]
    pub skip: bool,

    /// Name for export/import reuse across assets.
    #[serde(rename = "ExportAs")]
    pub export_as: String,
}

/// A 3D vector with double precision.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Vector3d {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

/// A 3D vector with integer components.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Vector3i {
    pub x: i32,
    pub y: i32,
    pub z: i32,
}

/// A material definition (solid/fluid pair).
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct MaterialAsset {
    #[serde(rename = "Solid")]
    pub solid: String,
    #[serde(rename = "Fluid")]
    pub fluid: String,
    #[serde(rename = "SolidBottomUp")]
    pub solid_bottom_up: bool,
}

/// A range with min/max double values.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RangeDouble {
    #[serde(rename = "Min")]
    pub min: f64,
    #[serde(rename = "Max")]
    pub max: f64,
}

/// Category of a V2 asset type (for UI organization).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum AssetCategory {
    Density,
    Curve,
    Pattern,
    MaterialProvider,
    PositionProvider,
    Prop,
    Scanner,
    Assignment,
    VectorProvider,
    EnvironmentProvider,
    TintProvider,
    BlockMask,
    Framework,
    WorldStructure,
    Biome,
    Settings,
    Directionality,
}
