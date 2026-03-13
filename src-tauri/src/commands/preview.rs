use crate::noise::evaluator::DensityEvaluator;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Deserialize)]
pub struct EvaluateRequest {
    /// The density graph as V2 JSON
    pub graph: Value,
    /// Grid resolution (e.g., 128 for 128x128)
    pub resolution: u32,
    /// World coordinate range
    pub range_min: f64,
    pub range_max: f64,
    /// Y level for 2D evaluation
    pub y_level: f64,
}

#[derive(Serialize)]
pub struct EvaluateResponse {
    /// Flattened NxN density values (row-major)
    pub values: Vec<f32>,
    /// Grid resolution
    pub resolution: u32,
    /// Min/max values in the result (for normalization)
    pub min_value: f32,
    pub max_value: f32,
}

/// Evaluate a density function graph at an NxN grid of positions.
#[tauri::command]
pub fn evaluate_density(request: EvaluateRequest) -> Result<EvaluateResponse, String> {
    // Cap resolution to prevent excessive memory allocation (2048^2 * 4 = 16 MB max)
    if request.resolution > 2048 {
        return Err(format!(
            "Resolution {} exceeds maximum of 2048",
            request.resolution
        ));
    }

    let evaluator =
        DensityEvaluator::from_json(&request.graph).map_err(|e| format!("Parse error: {}", e))?;

    let n = request.resolution as usize;
    let mut values = Vec::with_capacity(n * n);
    let step = (request.range_max - request.range_min) / n as f64;

    let mut min_val = f32::MAX;
    let mut max_val = f32::MIN;

    for z_idx in 0..n {
        let z = request.range_min + (z_idx as f64 + 0.5) * step;
        for x_idx in 0..n {
            let x = request.range_min + (x_idx as f64 + 0.5) * step;
            let val = evaluator.evaluate(x, request.y_level, z) as f32;
            min_val = min_val.min(val);
            max_val = max_val.max(val);
            values.push(val);
        }
    }

    Ok(EvaluateResponse {
        values,
        resolution: request.resolution,
        min_value: min_val,
        max_value: max_val,
    })
}
