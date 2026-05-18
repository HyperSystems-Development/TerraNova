#[cfg(test)]
mod tests {
    use crate::schema::biome::BiomeAsset;
    use crate::schema::density::DensityType;
    use crate::schema::settings::SettingsAsset;
    use crate::schema::world_structure::WorldStructureAsset;

    /// Helper: deserialize JSON string, reserialize, and compare parsed values.
    fn round_trip<T: serde::de::DeserializeOwned + serde::Serialize>(json: &str) {
        let original: serde_json::Value = serde_json::from_str(json).expect("parse original JSON");
        let typed: T = serde_json::from_str(json).expect("deserialize into typed struct");
        let reserialized = serde_json::to_value(&typed).expect("reserialize typed struct");

        // Compare all keys from the original that we expect to preserve
        let orig_obj = original.as_object().expect("original should be object");
        let reser_obj = reserialized
            .as_object()
            .expect("reserialized should be object");

        for (key, orig_val) in orig_obj {
            let reser_val = reser_obj
                .get(key)
                .unwrap_or_else(|| panic!("missing key '{}' in reserialized output", key));
            assert_eq!(
                orig_val, reser_val,
                "mismatch for key '{}': expected {:?}, got {:?}",
                key, orig_val, reser_val
            );
        }
    }

    // ── Settings ──────────────────────────────────────────────────────

    #[test]
    fn settings_round_trip() {
        let json = r#"{
            "CustomConcurrency": -1,
            "BufferCapacityFactor": 0.3,
            "TargetViewDistance": 512.0,
            "TargetPlayerCount": 3.0,
            "StatsCheckpoints": []
        }"#;
        round_trip::<SettingsAsset>(json);
    }

    #[test]
    fn settings_with_checkpoints() {
        let json = r#"{
            "CustomConcurrency": 4,
            "BufferCapacityFactor": 0.5,
            "TargetViewDistance": 1024.0,
            "TargetPlayerCount": 10.0,
            "StatsCheckpoints": [64, 128, 256]
        }"#;
        round_trip::<SettingsAsset>(json);
    }

    // ── WorldStructure ────────────────────────────────────────────────

    #[test]
    fn world_structure_round_trip() {
        let json = include_str!(
            "../../../templates/void/Server/HytaleGenerator/WorldStructures/MainWorld.json"
        );
        // WorldStructureAsset doesn't use tagged enum, just deserialize and check key fields
        let asset: WorldStructureAsset =
            serde_json::from_str(json).expect("deserialize WorldStructureAsset");

        assert_eq!(asset.structure_type, "NoiseRange");
        assert_eq!(asset.default_biome, "void_biome");
        assert_eq!(asset.default_transition_distance, 16);
        assert_eq!(asset.biomes.len(), 1);
        assert_eq!(asset.biomes[0].biome, "void_biome");
        assert_eq!(asset.biomes[0].min, -1.0);
        assert_eq!(asset.biomes[0].max, 1.0);

        // Reserialize and verify key fields survive
        let reserialized = serde_json::to_value(&asset).expect("reserialize");
        let obj = reserialized.as_object().unwrap();
        assert_eq!(obj["Type"], "NoiseRange");
        assert_eq!(obj["DefaultBiome"], "void_biome");
    }

    // ── Biome ─────────────────────────────────────────────────────────

    #[test]
    fn biome_round_trip() {
        let json =
            include_str!("../../../templates/void/Server/HytaleGenerator/Biomes/VoidBiome.json");
        let asset: BiomeAsset = serde_json::from_str(json).expect("deserialize BiomeAsset");

        assert_eq!(asset.name, "void_biome");
        assert!(asset.terrain.is_some());
        let terrain = asset.terrain.as_ref().unwrap();
        assert_eq!(terrain.terrain_type, "DAOTerrain");

        // Reserialize
        let reserialized = serde_json::to_value(&asset).expect("reserialize");
        let obj = reserialized.as_object().unwrap();
        assert_eq!(obj["Name"], "void_biome");
    }

    // ── Density Types ─────────────────────────────────────────────────

    #[test]
    fn density_constant_round_trip() {
        let json = r#"{"Type": "Constant", "Value": 42.0}"#;
        let density: DensityType = serde_json::from_str(json).expect("deserialize Constant");
        match &density {
            DensityType::Constant { value } => assert_eq!(*value, Some(42.0)),
            other => panic!("expected Constant, got {:?}", other),
        }
        let reserialized = serde_json::to_string(&density).expect("reserialize");
        assert!(reserialized.contains("\"Type\":\"Constant\""));
        assert!(reserialized.contains("42.0"));
    }

    #[test]
    fn density_simplex_noise_2d_round_trip() {
        let json = r#"{
            "Type": "SimplexNoise2D",
            "Lacunarity": 2.0,
            "Persistence": 0.5,
            "Scale": 256.0,
            "Octaves": 1,
            "Seed": "main"
        }"#;
        let density: DensityType = serde_json::from_str(json).expect("deserialize SimplexNoise2D");
        match &density {
            DensityType::SimplexNoise2D {
                lacunarity,
                persistence,
                scale,
                octaves,
                seed,
            } => {
                assert_eq!(*lacunarity, Some(2.0));
                assert_eq!(*persistence, Some(0.5));
                assert_eq!(*scale, Some(256.0));
                assert_eq!(*octaves, Some(1));
                assert_eq!(seed.as_deref(), Some("main"));
            }
            other => panic!("expected SimplexNoise2D, got {:?}", other),
        }

        // Round-trip through JSON
        let reserialized = serde_json::to_value(&density).expect("reserialize");
        let obj = reserialized.as_object().unwrap();
        assert_eq!(obj["Type"], "SimplexNoise2D");
        assert_eq!(obj["Scale"], 256.0);
    }

    #[test]
    fn density_clamp_round_trip() {
        let json = r#"{"Type": "Clamp", "WallA": -1.0, "WallB": 1.0}"#;
        let density: DensityType = serde_json::from_str(json).expect("deserialize Clamp");
        match &density {
            DensityType::Clamp {
                wall_a,
                wall_b,
                input,
            } => {
                assert_eq!(*wall_a, Some(-1.0));
                assert_eq!(*wall_b, Some(1.0));
                assert!(input.is_none());
            }
            other => panic!("expected Clamp, got {:?}", other),
        }
    }

    #[test]
    fn density_normalizer_round_trip() {
        let json = r#"{
            "Type": "Normalizer",
            "FromMin": -1.0,
            "FromMax": 1.0,
            "ToMin": 0.0,
            "ToMax": 100.0
        }"#;
        let density: DensityType = serde_json::from_str(json).expect("deserialize Normalizer");
        match &density {
            DensityType::Normalizer {
                from_min,
                from_max,
                to_min,
                to_max,
                ..
            } => {
                assert_eq!(*from_min, Some(-1.0));
                assert_eq!(*from_max, Some(1.0));
                assert_eq!(*to_min, Some(0.0));
                assert_eq!(*to_max, Some(100.0));
            }
            other => panic!("expected Normalizer, got {:?}", other),
        }
    }

    #[test]
    fn density_sum_with_nested_inputs() {
        let json = r#"{
            "Type": "Sum",
            "Inputs": [
                {"Type": "Constant", "Value": 1.0},
                {"Type": "Constant", "Value": 2.0}
            ]
        }"#;
        let density: DensityType = serde_json::from_str(json).expect("deserialize Sum");
        match &density {
            DensityType::Sum { inputs } => {
                assert_eq!(inputs.len(), 2);
            }
            other => panic!("expected Sum, got {:?}", other),
        }

        let reserialized = serde_json::to_value(&density).expect("reserialize");
        let inputs = reserialized["Inputs"].as_array().unwrap();
        assert_eq!(inputs.len(), 2);
        assert_eq!(inputs[0]["Type"], "Constant");
    }

    #[test]
    fn density_gradient_round_trip() {
        let json = r#"{"Type": "Gradient", "From": 1.0, "To": 0.0, "FromY": 0.0, "ToY": 128.0}"#;
        let density: DensityType = serde_json::from_str(json).expect("deserialize Gradient");
        match &density {
            DensityType::Gradient {
                from,
                to,
                from_y,
                to_y,
            } => {
                assert_eq!(*from, Some(1.0));
                assert_eq!(*to, Some(0.0));
                assert_eq!(*from_y, Some(0.0));
                assert_eq!(*to_y, Some(128.0));
            }
            other => panic!("expected Gradient, got {:?}", other),
        }
    }

    #[test]
    fn density_fast_gradient_warp_round_trip() {
        let json = r#"{
            "Type": "FastGradientWarp",
            "WarpScale": 64.0,
            "WarpLacunarity": 2.0,
            "WarpPersistence": 0.5,
            "WarpOctaves": 3,
            "WarpFactor": 0.4
        }"#;
        let density: DensityType =
            serde_json::from_str(json).expect("deserialize FastGradientWarp");
        match &density {
            DensityType::FastGradientWarp {
                warp_scale,
                warp_octaves,
                warp_factor,
                ..
            } => {
                assert_eq!(*warp_scale, Some(64.0));
                assert_eq!(*warp_octaves, Some(3));
                assert_eq!(*warp_factor, Some(0.4));
            }
            other => panic!("expected FastGradientWarp, got {:?}", other),
        }
    }

    #[test]
    fn density_all_coordinate_accessors() {
        for type_name in ["XValue", "YValue", "ZValue"] {
            let json = format!(r#"{{"Type": "{}"}}"#, type_name);
            let _density: DensityType =
                serde_json::from_str(&json).expect(&format!("deserialize {}", type_name));
        }
    }

    #[test]
    fn density_pipeline_round_trip() {
        let json = r#"{
            "Type": "Pipeline",
            "Steps": [{"Type": "Constant", "Value": 1.0}]
        }"#;
        let density: DensityType = serde_json::from_str(json).expect("deserialize Pipeline");
        match &density {
            DensityType::Pipeline { steps, input } => {
                assert_eq!(steps.len(), 1);
                assert!(input.is_none());
            }
            other => panic!("expected Pipeline, got {:?}", other),
        }
    }

    #[test]
    fn density_abs_round_trip() {
        let json = r#"{"Type": "Abs", "Input": {"Type": "Constant", "Value": -5.0}}"#;
        let density: DensityType = serde_json::from_str(json).expect("deserialize Abs");
        match &density {
            DensityType::Abs { input } => assert!(input.is_some()),
            other => panic!("expected Abs, got {:?}", other),
        }
        let reserialized = serde_json::to_value(&density).expect("reserialize");
        assert_eq!(reserialized["Type"], "Abs");
    }

    #[test]
    fn density_inverter_round_trip() {
        let json = r#"{"Type": "Inverter", "Input": {"Type": "Constant", "Value": 3.0}}"#;
        let density: DensityType = serde_json::from_str(json).expect("deserialize Inverter");
        match &density {
            DensityType::Inverter { input } => assert!(input.is_some()),
            other => panic!("expected Inverter, got {:?}", other),
        }
    }

    #[test]
    fn density_multiplier_round_trip() {
        let json = r#"{
            "Type": "Multiplier",
            "Inputs": [
                {"Type": "Constant", "Value": 2.0},
                {"Type": "Constant", "Value": 3.0}
            ]
        }"#;
        let density: DensityType = serde_json::from_str(json).expect("deserialize Multiplier");
        match &density {
            DensityType::Multiplier { inputs } => assert_eq!(inputs.len(), 2),
            other => panic!("expected Multiplier, got {:?}", other),
        }
    }

    #[test]
    fn density_sqrt_round_trip() {
        let json = r#"{"Type": "Sqrt", "Input": {"Type": "Constant", "Value": 9.0}}"#;
        let density: DensityType = serde_json::from_str(json).expect("deserialize Sqrt");
        match &density {
            DensityType::Sqrt { input } => assert!(input.is_some()),
            other => panic!("expected Sqrt, got {:?}", other),
        }
    }

    #[test]
    fn density_mix_round_trip() {
        let json = r#"{
            "Type": "Mix",
            "Inputs": [
                {"Type": "Constant", "Value": 0.0},
                {"Type": "Constant", "Value": 1.0}
            ]
        }"#;
        let density: DensityType = serde_json::from_str(json).expect("deserialize Mix");
        match &density {
            DensityType::Mix { inputs } => assert_eq!(inputs.len(), 2),
            other => panic!("expected Mix, got {:?}", other),
        }
    }

    #[test]
    fn density_scale_round_trip() {
        let json = r#"{"Type": "Scale", "X": 2.0, "Y": 1.0, "Z": 2.0}"#;
        let density: DensityType = serde_json::from_str(json).expect("deserialize Scale");
        match &density {
            DensityType::Scale { x, y, z, input } => {
                assert_eq!(*x, Some(2.0));
                assert_eq!(*y, Some(1.0));
                assert_eq!(*z, Some(2.0));
                assert!(input.is_none());
            }
            other => panic!("expected Scale, got {:?}", other),
        }
    }

    #[test]
    fn density_min_max_round_trip() {
        let json = r#"{
            "Type": "Min",
            "Inputs": [
                {"Type": "Constant", "Value": 5.0},
                {"Type": "Constant", "Value": 10.0}
            ]
        }"#;
        let density: DensityType = serde_json::from_str(json).expect("deserialize Min");
        match &density {
            DensityType::Min { inputs } => assert_eq!(inputs.len(), 2),
            other => panic!("expected Min, got {:?}", other),
        }

        let json_max = r#"{
            "Type": "Max",
            "Inputs": [
                {"Type": "Constant", "Value": 5.0},
                {"Type": "Constant", "Value": 10.0}
            ]
        }"#;
        let density_max: DensityType = serde_json::from_str(json_max).expect("deserialize Max");
        match &density_max {
            DensityType::Max { inputs } => assert_eq!(inputs.len(), 2),
            other => panic!("expected Max, got {:?}", other),
        }
    }

    #[test]
    fn density_cache_round_trip() {
        let json =
            r#"{"Type": "Cache", "Capacity": 256, "Input": {"Type": "Constant", "Value": 1.0}}"#;
        let density: DensityType = serde_json::from_str(json).expect("deserialize Cache");
        match &density {
            DensityType::Cache { capacity, input } => {
                assert_eq!(*capacity, Some(256));
                assert!(input.is_some());
            }
            other => panic!("expected Cache, got {:?}", other),
        }
    }

    #[test]
    fn density_imported_round_trip() {
        let json = r#"{"Type": "Imported", "Name": "terrain_base"}"#;
        let density: DensityType = serde_json::from_str(json).expect("deserialize Imported");
        match &density {
            DensityType::Imported { name } => assert_eq!(name.as_deref(), Some("terrain_base")),
            other => panic!("expected Imported, got {:?}", other),
        }
    }

    #[test]
    fn density_exported_round_trip() {
        let json = r#"{"Type": "Exported", "SingleInstance": true, "Density": {"Type": "Constant", "Value": 1.0}}"#;
        let density: DensityType = serde_json::from_str(json).expect("deserialize Exported");
        match &density {
            DensityType::Exported {
                single_instance,
                density,
                ..
            } => {
                assert_eq!(*single_instance, Some(true));
                assert!(density.is_some());
            }
            other => panic!("expected Exported, got {:?}", other),
        }
    }

    #[test]
    fn density_cell_noise_2d_round_trip() {
        let json = r#"{"Type": "CellNoise2D", "Scale": 128.0, "Seed": "biome", "ReturnType": "Distance", "DistanceFunction": "Euclidean"}"#;
        let density: DensityType = serde_json::from_str(json).expect("deserialize CellNoise2D");
        match &density {
            DensityType::CellNoise2D {
                scale,
                seed,
                return_type,
                distance_function,
            } => {
                assert_eq!(*scale, Some(128.0));
                assert_eq!(seed.as_deref(), Some("biome"));
                assert_eq!(return_type.as_deref(), Some("Distance"));
                assert_eq!(distance_function.as_deref(), Some("Euclidean"));
            }
            other => panic!("expected CellNoise2D, got {:?}", other),
        }
    }

    #[test]
    fn density_switch_round_trip() {
        let json = r#"{"Type": "Switch", "SwitchCases": [{"Type": "Constant", "Value": 1.0}]}"#;
        let density: DensityType = serde_json::from_str(json).expect("deserialize Switch");
        match &density {
            DensityType::Switch {
                switch_cases,
                input,
            } => {
                assert_eq!(switch_cases.len(), 1);
                assert!(input.is_none());
            }
            other => panic!("expected Switch, got {:?}", other),
        }
    }

    #[test]
    fn density_offset_constant_round_trip() {
        let json = r#"{"Type": "OffsetConstant", "Offset": 10.0, "Input": {"Type": "Constant", "Value": 5.0}}"#;
        let density: DensityType = serde_json::from_str(json).expect("deserialize OffsetConstant");
        match &density {
            DensityType::OffsetConstant { offset, input } => {
                assert_eq!(*offset, Some(10.0));
                assert!(input.is_some());
            }
            other => panic!("expected OffsetConstant, got {:?}", other),
        }
    }

    #[test]
    fn density_amplitude_constant_round_trip() {
        let json = r#"{"Type": "AmplitudeConstant", "Amplitude": 2.5, "Input": {"Type": "Constant", "Value": 1.0}}"#;
        let density: DensityType =
            serde_json::from_str(json).expect("deserialize AmplitudeConstant");
        match &density {
            DensityType::AmplitudeConstant { amplitude, input } => {
                assert_eq!(*amplitude, Some(2.5));
                assert!(input.is_some());
            }
            other => panic!("expected AmplitudeConstant, got {:?}", other),
        }
    }

    #[test]
    fn density_smooth_clamp_round_trip() {
        let json = r#"{"Type": "SmoothClamp", "WallA": -1.0, "WallB": 1.0, "Range": 0.1}"#;
        let density: DensityType = serde_json::from_str(json).expect("deserialize SmoothClamp");
        match &density {
            DensityType::SmoothClamp {
                wall_a,
                wall_b,
                range,
                input,
            } => {
                assert_eq!(*wall_a, Some(-1.0));
                assert_eq!(*wall_b, Some(1.0));
                assert_eq!(*range, Some(0.1));
                assert!(input.is_none());
            }
            other => panic!("expected SmoothClamp, got {:?}", other),
        }
    }
}
