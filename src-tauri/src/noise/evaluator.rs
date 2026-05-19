use serde_json::Value;

use super::nodes::NodeEval;

/// Density function evaluator.
/// Parses a V2 density graph JSON and evaluates it at (x, y, z) coordinates.
pub struct DensityEvaluator {
    root: Box<dyn NodeEval>,
}

impl DensityEvaluator {
    /// Parse a V2 density function JSON into an evaluable graph.
    pub fn from_json(json: &Value) -> Result<Self, String> {
        let root = parse_node(json)?;
        Ok(DensityEvaluator { root })
    }

    /// Evaluate the density function at a world position.
    pub fn evaluate(&self, x: f64, y: f64, z: f64) -> f64 {
        self.root.eval(x, y, z)
    }
}

/// Recursively parse a JSON node into an evaluable node.
fn parse_node(json: &Value) -> Result<Box<dyn NodeEval>, String> {
    let obj = json
        .as_object()
        .ok_or("Density node must be a JSON object")?;

    let node_type = obj
        .get("Type")
        .and_then(|v| v.as_str())
        .ok_or("Missing 'Type' field")?;

    match node_type {
        "Constant" => {
            let value = obj.get("Value").and_then(|v| v.as_f64()).unwrap_or(0.0);
            Ok(Box::new(super::nodes::ConstantNode { value }))
        }

        "SimplexNoise2D" => {
            let lacunarity = obj
                .get("Lacunarity")
                .and_then(|v| v.as_f64())
                .unwrap_or(2.0);
            let persistence = obj
                .get("Persistence")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.5);
            let scale = obj.get("Scale").and_then(|v| v.as_f64()).unwrap_or(1.0);
            let octaves = obj.get("Octaves").and_then(|v| v.as_i64()).unwrap_or(1) as i32;
            let seed = obj
                .get("Seed")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            Ok(Box::new(super::nodes::SimplexNoise2DNode::new(
                lacunarity,
                persistence,
                scale,
                octaves,
                seed,
            )))
        }

        "Sum" => {
            let inputs = parse_inputs(obj)?;
            Ok(Box::new(super::nodes::SumNode { inputs }))
        }

        "Clamp" => {
            let input = parse_single_input(obj)?;
            let wall_a = obj.get("WallA").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let wall_b = obj.get("WallB").and_then(|v| v.as_f64()).unwrap_or(1.0);
            Ok(Box::new(super::nodes::ClampNode {
                input,
                min: wall_a,
                max: wall_b,
            }))
        }

        "Normalizer" => {
            let input = parse_single_input(obj)?;
            let from_min = obj.get("FromMin").and_then(|v| v.as_f64()).unwrap_or(-1.0);
            let from_max = obj.get("FromMax").and_then(|v| v.as_f64()).unwrap_or(1.0);
            let to_min = obj.get("ToMin").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let to_max = obj.get("ToMax").and_then(|v| v.as_f64()).unwrap_or(1.0);
            Ok(Box::new(super::nodes::NormalizerNode {
                input,
                from_min,
                from_max,
                to_min,
                to_max,
            }))
        }

        _ => {
            // Unknown types evaluate as zero
            Ok(Box::new(super::nodes::ConstantNode { value: 0.0 }))
        }
    }
}

/// Parse the "Inputs" array from a node object.
fn parse_inputs(obj: &serde_json::Map<String, Value>) -> Result<Vec<Box<dyn NodeEval>>, String> {
    let inputs_arr = obj
        .get("Inputs")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let mut nodes = Vec::new();
    for input_json in &inputs_arr {
        nodes.push(parse_node(input_json)?);
    }
    Ok(nodes)
}

/// Parse the first element of "Inputs" as a single input.
fn parse_single_input(obj: &serde_json::Map<String, Value>) -> Result<Box<dyn NodeEval>, String> {
    let inputs_arr = obj
        .get("Inputs")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    if let Some(first) = inputs_arr.first() {
        parse_node(first)
    } else {
        Ok(Box::new(super::nodes::ConstantNode { value: 0.0 }))
    }
}
