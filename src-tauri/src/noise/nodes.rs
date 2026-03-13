use fastnoise_lite::FastNoiseLite;

/// Trait for evaluable density function nodes.
pub trait NodeEval: Send + Sync {
    fn eval(&self, x: f64, y: f64, z: f64) -> f64;
}

/// Constant value node.
pub struct ConstantNode {
    pub value: f64,
}

impl NodeEval for ConstantNode {
    fn eval(&self, _x: f64, _y: f64, _z: f64) -> f64 {
        self.value
    }
}

/// SimplexNoise2D node using fastnoise-lite.
pub struct SimplexNoise2DNode {
    noise: FastNoiseLite,
    octaves: i32,
    lacunarity: f64,
    persistence: f64,
    scale: f64,
}

impl SimplexNoise2DNode {
    pub fn new(
        lacunarity: f64,
        persistence: f64,
        scale: f64,
        octaves: i32,
        seed: String,
    ) -> Self {
        // Cap octaves to prevent excessive computation (32 octaves is already extreme)
        let octaves = octaves.clamp(1, 32);
        let mut noise = FastNoiseLite::new();
        noise.set_noise_type(Some(fastnoise_lite::NoiseType::OpenSimplex2));

        // Use seed string hash as integer seed
        let seed_int: i32 = if seed.is_empty() {
            0
        } else {
            seed.bytes().fold(0i32, |acc, b| acc.wrapping_mul(31).wrapping_add(b as i32))
        };
        noise.set_seed(Some(seed_int));
        noise.set_frequency(Some((1.0 / scale.max(0.001)) as f32));

        SimplexNoise2DNode {
            noise,
            octaves,
            lacunarity,
            persistence,
            scale,
        }
    }
}

impl NodeEval for SimplexNoise2DNode {
    fn eval(&self, x: f64, _y: f64, z: f64) -> f64 {
        let mut value = 0.0;
        let mut amplitude = 1.0;
        let mut frequency = 1.0 / self.scale.max(0.001);
        let mut max_amp = 0.0;

        for _ in 0..self.octaves {
            let nx = (x * frequency) as f32;
            let nz = (z * frequency) as f32;
            value += self.noise.get_noise_2d(nx, nz) as f64 * amplitude;
            max_amp += amplitude;
            amplitude *= self.persistence;
            frequency *= self.lacunarity;
        }

        if max_amp > 0.0 {
            value / max_amp
        } else {
            0.0
        }
    }
}

/// Sum of multiple inputs.
pub struct SumNode {
    pub inputs: Vec<Box<dyn NodeEval>>,
}

impl NodeEval for SumNode {
    fn eval(&self, x: f64, y: f64, z: f64) -> f64 {
        self.inputs.iter().map(|input| input.eval(x, y, z)).sum()
    }
}

/// Clamp node: clamps input between min and max.
pub struct ClampNode {
    pub input: Box<dyn NodeEval>,
    pub min: f64,
    pub max: f64,
}

impl NodeEval for ClampNode {
    fn eval(&self, x: f64, y: f64, z: f64) -> f64 {
        self.input.eval(x, y, z).clamp(self.min, self.max)
    }
}

/// Normalizer node: remaps input from source range to target range.
pub struct NormalizerNode {
    pub input: Box<dyn NodeEval>,
    pub from_min: f64,
    pub from_max: f64,
    pub to_min: f64,
    pub to_max: f64,
}

impl NodeEval for NormalizerNode {
    fn eval(&self, x: f64, y: f64, z: f64) -> f64 {
        let val = self.input.eval(x, y, z);
        let from_range = self.from_max - self.from_min;
        if from_range.abs() < f64::EPSILON {
            return self.to_min;
        }
        let normalized = (val - self.from_min) / from_range;
        self.to_min + normalized * (self.to_max - self.to_min)
    }
}
