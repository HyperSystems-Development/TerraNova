use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Severity level for validation errors.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Severity {
    Error,
    Warning,
    Info,
}

/// A single validation error.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub file: String,
    pub field: String,
    pub message: String,
    pub severity: Severity,
}

/// Result of validating an asset pack.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<ValidationError>,
    pub files_checked: usize,
}

/// All known V2 density type names.
const KNOWN_DENSITY_TYPES: &[&str] = &[
    "SimplexNoise2D", "SimplexNoise3D", "CellNoise2D", "CellNoise3D",
    "Constant", "Sum", "Multiplier", "Abs", "Inverter", "Sqrt", "Pow",
    "OffsetConstant", "AmplitudeConstant",
    "Clamp", "SmoothClamp", "Floor", "SmoothFloor", "Ceiling", "SmoothCeiling",
    "Min", "SmoothMin", "Max", "SmoothMax",
    "Normalizer", "CurveMapper", "Offset", "Amplitude",
    "Mix", "MultiMix",
    "Scale", "Slider", "Rotator", "Anchor", "XOverride", "YOverride", "ZOverride",
    "GradientWarp", "FastGradientWarp", "VectorWarp",
    "Distance", "Cube", "Ellipsoid", "Cuboid", "Cylinder", "Plane", "Axis", "Shell", "Angle",
    "XValue", "YValue", "ZValue",
    "Terrain", "BaseHeight", "CellWallDistance", "DistanceToBiomeEdge",
    "Gradient", "Cache", "Cache2D", "YSampled",
    "Switch", "SwitchState",
    "PositionsCellNoise", "Positions3D", "PositionsPinch", "PositionsTwist",
    "Exported", "Imported", "Pipeline",
];

/// Known top-level asset type names (non-density).
const KNOWN_STRUCTURE_TYPES: &[&str] = &[
    "NoiseRange", "DAOTerrain",
];

/// Maximum nesting depth for recursive validation to prevent stack overflow
/// from maliciously crafted deeply-nested JSON.
const MAX_VALIDATION_DEPTH: usize = 64;

/// Validate a single asset JSON against V2 schema rules.
pub fn validate_asset(file_path: &str, value: &Value) -> Vec<ValidationError> {
    validate_asset_inner(file_path, value, 0)
}

fn validate_asset_inner(file_path: &str, value: &Value, depth: usize) -> Vec<ValidationError> {
    let mut errors = Vec::new();

    if depth > MAX_VALIDATION_DEPTH {
        errors.push(ValidationError {
            file: file_path.to_string(),
            field: String::new(),
            message: format!("Nesting exceeds maximum depth of {}", MAX_VALIDATION_DEPTH),
            severity: Severity::Warning,
        });
        return errors;
    }

    let obj = match value.as_object() {
        Some(obj) => obj,
        None => {
            errors.push(ValidationError {
                file: file_path.to_string(),
                field: String::new(),
                message: "Root value must be a JSON object".to_string(),
                severity: Severity::Error,
            });
            return errors;
        }
    };

    // Check for Type field presence on assets that should have one
    let type_name = obj.get("Type").and_then(|v| v.as_str());

    if type_name.is_none() {
        // Settings files don't have Type, Biome files might not either
        if file_path.contains("Density") || file_path.contains("WorldStructures") {
            errors.push(ValidationError {
                file: file_path.to_string(),
                field: "Type".to_string(),
                message: "Missing required 'Type' field".to_string(),
                severity: Severity::Error,
            });
        }
        // For files without Type, validate Settings-specific fields
        if file_path.contains("Settings") {
            validate_settings(file_path, obj, &mut errors);
        }
        return errors;
    }

    let type_name = type_name.unwrap();

    // Check if Type is a known type name
    let is_known = KNOWN_DENSITY_TYPES.contains(&type_name)
        || KNOWN_STRUCTURE_TYPES.contains(&type_name);

    if !is_known {
        errors.push(ValidationError {
            file: file_path.to_string(),
            field: "Type".to_string(),
            message: format!("Unknown type '{}' — not a recognized V2 type", type_name),
            severity: Severity::Warning,
        });
    }

    // Per-type validation rules
    match type_name {
        "Constant" => {
            validate_required_field(file_path, obj, "Value", &mut errors);
        }
        "SimplexNoise2D" => {
            validate_positive_field(file_path, obj, "Scale", &mut errors);
            validate_min_int_field(file_path, obj, "Octaves", 1, &mut errors);
        }
        "SimplexNoise3D" => {
            validate_positive_field(file_path, obj, "ScaleXZ", &mut errors);
            validate_positive_field(file_path, obj, "ScaleY", &mut errors);
            validate_min_int_field(file_path, obj, "Octaves", 1, &mut errors);
        }
        "CellNoise2D" | "CellNoise3D" => {
            validate_positive_field(file_path, obj, "Scale", &mut errors);
        }
        "Clamp" | "SmoothClamp" => {
            validate_required_field(file_path, obj, "WallA", &mut errors);
            validate_required_field(file_path, obj, "WallB", &mut errors);
        }
        "Normalizer" => {
            validate_required_field(file_path, obj, "FromMin", &mut errors);
            validate_required_field(file_path, obj, "FromMax", &mut errors);
            validate_required_field(file_path, obj, "ToMin", &mut errors);
            validate_required_field(file_path, obj, "ToMax", &mut errors);
        }
        "Pow" => {
            validate_required_field(file_path, obj, "Exponent", &mut errors);
        }
        "OffsetConstant" => {
            validate_required_field(file_path, obj, "Offset", &mut errors);
        }
        "AmplitudeConstant" => {
            validate_required_field(file_path, obj, "Amplitude", &mut errors);
        }
        "Sum" | "Multiplier" => {
            validate_min_array_length(file_path, obj, "Inputs", 2, &mut errors);
        }
        "Mix" => {
            validate_min_array_length(file_path, obj, "Inputs", 2, &mut errors);
        }
        "Scale" => {
            validate_required_field(file_path, obj, "X", &mut errors);
            validate_required_field(file_path, obj, "Y", &mut errors);
            validate_required_field(file_path, obj, "Z", &mut errors);
        }
        "Slider" => {
            // At least one slide axis should be present
        }
        "Min" | "Max" => {
            validate_min_array_length(file_path, obj, "Inputs", 2, &mut errors);
        }
        "SmoothMin" | "SmoothMax" => {
            validate_required_field(file_path, obj, "Range", &mut errors);
            validate_min_array_length(file_path, obj, "Inputs", 2, &mut errors);
        }
        "Switch" => {
            validate_required_field(file_path, obj, "SwitchCases", &mut errors);
        }
        "Exported" => {
            // Exported should have either Density or Input
        }
        "Imported" => {
            validate_required_field(file_path, obj, "Name", &mut errors);
        }
        "CurveMapper" => {
            validate_required_field(file_path, obj, "Curve", &mut errors);
        }
        "Abs" | "Inverter" | "Sqrt" | "Floor" | "Ceiling" => {
            validate_required_field(file_path, obj, "Input", &mut errors);
        }
        "FastGradientWarp" => {
            validate_positive_field(file_path, obj, "WarpScale", &mut errors);
            validate_min_int_field(file_path, obj, "WarpOctaves", 1, &mut errors);
        }
        "Cache" => {
            validate_min_int_field(file_path, obj, "Capacity", 1, &mut errors);
        }
        "Gradient" => {
            validate_required_field(file_path, obj, "FromY", &mut errors);
            validate_required_field(file_path, obj, "ToY", &mut errors);
        }
        "NoiseRange" => {
            validate_required_field(file_path, obj, "DefaultBiome", &mut errors);
            if let Some(biomes) = obj.get("Biomes") {
                if let Some(arr) = biomes.as_array() {
                    if arr.is_empty() {
                        errors.push(ValidationError {
                            file: file_path.to_string(),
                            field: "Biomes".to_string(),
                            message: "Biomes array should not be empty".to_string(),
                            severity: Severity::Warning,
                        });
                    }
                    for (i, biome) in arr.iter().enumerate() {
                        if let Some(bobj) = biome.as_object() {
                            if !bobj.contains_key("Biome") {
                                errors.push(ValidationError {
                                    file: file_path.to_string(),
                                    field: format!("Biomes[{}].Biome", i),
                                    message: "Biome entry missing 'Biome' field".to_string(),
                                    severity: Severity::Error,
                                });
                            }
                        }
                    }
                }
            }
        }
        _ => {}
    }

    // Recursively validate nested assets
    for (key, val) in obj.iter() {
        if key == "Type" { continue; }
        if let Some(nested_obj) = val.as_object() {
            if nested_obj.contains_key("Type") {
                let nested_path = format!("{} > {}", file_path, key);
                errors.extend(validate_asset_inner(&nested_path, val, depth + 1));
            }
        }
        if let Some(arr) = val.as_array() {
            for (i, item) in arr.iter().enumerate() {
                if let Some(item_obj) = item.as_object() {
                    if item_obj.contains_key("Type") {
                        let nested_path = format!("{} > {}[{}]", file_path, key, i);
                        errors.extend(validate_asset_inner(&nested_path, item, depth + 1));
                    }
                }
            }
        }
    }

    errors
}

fn validate_settings(
    file_path: &str,
    obj: &serde_json::Map<String, Value>,
    errors: &mut Vec<ValidationError>,
) {
    if let Some(cc) = obj.get("CustomConcurrency") {
        if let Some(n) = cc.as_i64() {
            if n < -1 {
                errors.push(ValidationError {
                    file: file_path.to_string(),
                    field: "CustomConcurrency".to_string(),
                    message: "CustomConcurrency must be >= -1".to_string(),
                    severity: Severity::Error,
                });
            }
        }
    }
    if let Some(bcf) = obj.get("BufferCapacityFactor") {
        if let Some(n) = bcf.as_f64() {
            if n <= 0.0 {
                errors.push(ValidationError {
                    file: file_path.to_string(),
                    field: "BufferCapacityFactor".to_string(),
                    message: "BufferCapacityFactor must be > 0".to_string(),
                    severity: Severity::Error,
                });
            }
        }
    }
    if let Some(tvd) = obj.get("TargetViewDistance") {
        if let Some(n) = tvd.as_f64() {
            if n <= 0.0 {
                errors.push(ValidationError {
                    file: file_path.to_string(),
                    field: "TargetViewDistance".to_string(),
                    message: "TargetViewDistance must be > 0".to_string(),
                    severity: Severity::Error,
                });
            }
        }
    }
}

fn validate_required_field(
    file_path: &str,
    obj: &serde_json::Map<String, Value>,
    field: &str,
    errors: &mut Vec<ValidationError>,
) {
    if !obj.contains_key(field) {
        errors.push(ValidationError {
            file: file_path.to_string(),
            field: field.to_string(),
            message: format!("Missing required field '{}'", field),
            severity: Severity::Error,
        });
    }
}

fn validate_positive_field(
    file_path: &str,
    obj: &serde_json::Map<String, Value>,
    field: &str,
    errors: &mut Vec<ValidationError>,
) {
    if let Some(val) = obj.get(field) {
        if let Some(n) = val.as_f64() {
            if n <= 0.0 {
                errors.push(ValidationError {
                    file: file_path.to_string(),
                    field: field.to_string(),
                    message: format!("'{}' must be > 0 (got {})", field, n),
                    severity: Severity::Error,
                });
            }
        }
    }
}

fn validate_min_array_length(
    file_path: &str,
    obj: &serde_json::Map<String, Value>,
    field: &str,
    min_len: usize,
    errors: &mut Vec<ValidationError>,
) {
    match obj.get(field) {
        Some(val) => {
            if let Some(arr) = val.as_array() {
                if arr.len() < min_len {
                    errors.push(ValidationError {
                        file: file_path.to_string(),
                        field: field.to_string(),
                        message: format!("'{}' should have at least {} items (got {})", field, min_len, arr.len()),
                        severity: Severity::Warning,
                    });
                }
            }
        }
        None => {
            errors.push(ValidationError {
                file: file_path.to_string(),
                field: field.to_string(),
                message: format!("Missing required field '{}'", field),
                severity: Severity::Warning,
            });
        }
    }
}

fn validate_min_int_field(
    file_path: &str,
    obj: &serde_json::Map<String, Value>,
    field: &str,
    min: i64,
    errors: &mut Vec<ValidationError>,
) {
    if let Some(val) = obj.get(field) {
        if let Some(n) = val.as_i64() {
            if n < min {
                errors.push(ValidationError {
                    file: file_path.to_string(),
                    field: field.to_string(),
                    message: format!("'{}' must be >= {} (got {})", field, min, n),
                    severity: Severity::Error,
                });
            }
        }
    }
}

#[cfg(test)]
mod validation_tests {
    use super::*;

    #[test]
    fn valid_constant() {
        let json: Value = serde_json::from_str(r#"{"Type": "Constant", "Value": 1.0}"#).unwrap();
        let errors = validate_asset("test.json", &json);
        assert!(errors.is_empty(), "expected no errors, got: {:?}", errors);
    }

    #[test]
    fn missing_constant_value() {
        let json: Value = serde_json::from_str(r#"{"Type": "Constant"}"#).unwrap();
        let errors = validate_asset("test.json", &json);
        assert_eq!(errors.len(), 1);
        assert_eq!(errors[0].field, "Value");
        assert_eq!(errors[0].severity, Severity::Error);
    }

    #[test]
    fn invalid_octaves() {
        let json: Value = serde_json::from_str(
            r#"{"Type": "SimplexNoise2D", "Scale": 1.0, "Octaves": 0}"#,
        )
        .unwrap();
        let errors = validate_asset("test.json", &json);
        assert!(errors.iter().any(|e| e.field == "Octaves"));
    }

    #[test]
    fn negative_scale() {
        let json: Value = serde_json::from_str(
            r#"{"Type": "SimplexNoise2D", "Scale": -5.0}"#,
        )
        .unwrap();
        let errors = validate_asset("test.json", &json);
        assert!(errors.iter().any(|e| e.field == "Scale"));
    }

    #[test]
    fn unknown_type_warning() {
        let json: Value = serde_json::from_str(r#"{"Type": "MadeUpType"}"#).unwrap();
        let errors = validate_asset("test.json", &json);
        assert!(errors.iter().any(|e| e.severity == Severity::Warning && e.field == "Type"));
    }

    #[test]
    fn nested_validation() {
        let json: Value = serde_json::from_str(
            r#"{"Type": "Sum", "Inputs": [{"Type": "Constant"}]}"#,
        )
        .unwrap();
        let errors = validate_asset("test.json", &json);
        // Nested Constant is missing Value
        assert!(errors.iter().any(|e| e.field == "Value"));
    }

    #[test]
    fn valid_settings() {
        let json: Value = serde_json::from_str(
            r#"{"CustomConcurrency": -1, "BufferCapacityFactor": 0.3, "TargetViewDistance": 512.0}"#,
        )
        .unwrap();
        let errors = validate_asset("Settings/Settings.json", &json);
        assert!(errors.is_empty(), "expected no errors, got: {:?}", errors);
    }

    #[test]
    fn depth_limit_prevents_stack_overflow() {
        // Build a serde_json::Value tree nested 70 levels deep (exceeds
        // MAX_VALIDATION_DEPTH of 64). We construct the Value programmatically
        // to avoid serde_json's parser recursion limit.
        let mut inner = serde_json::json!({"Type": "Constant", "Value": 1.0});
        for _ in 0..70 {
            inner = serde_json::json!({"Type": "Sum", "Inputs": [inner]});
        }
        let errors = validate_asset("test.json", &inner);
        assert!(
            errors.iter().any(|e| e.message.contains("maximum depth")),
            "expected depth limit warning, got: {:?}",
            errors
        );
    }

    #[test]
    fn invalid_settings_concurrency() {
        let json: Value = serde_json::from_str(
            r#"{"CustomConcurrency": -5, "BufferCapacityFactor": 0.3}"#,
        )
        .unwrap();
        let errors = validate_asset("Settings/Settings.json", &json);
        assert!(errors.iter().any(|e| e.field == "CustomConcurrency"));
    }
}
