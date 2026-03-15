#[cfg(test)]
mod tests {
    use crate::bridge::client::{BridgeClient, BridgeState};
    use crate::bridge::types::*;

    // ── ServerStatus ─────────────────────────────────────────────────

    #[test]
    fn server_status_deserialize() {
        let json = r#"{
            "status": "ok",
            "bridge_version": "1.0.0",
            "player_count": 1,
            "port": 7854
        }"#;
        let status: ServerStatus = serde_json::from_str(json).unwrap();
        assert_eq!(status.status, "ok");
        assert_eq!(status.bridge_version, "1.0.0");
        assert_eq!(status.player_count, 1);
        assert_eq!(status.port, 7854);
    }

    #[test]
    fn server_status_round_trip() {
        let original = ServerStatus {
            status: "ok".into(),
            bridge_version: "1.0.0".into(),
            player_count: 5,
            port: 7854,
            singleplayer: false,
        };
        let json = serde_json::to_string(&original).unwrap();
        let parsed: ServerStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.status, "ok");
        assert_eq!(parsed.bridge_version, "1.0.0");
        assert_eq!(parsed.player_count, 5);
        assert_eq!(parsed.port, 7854);
    }

    // ── BridgeResponse ───────────────────────────────────────────────

    #[test]
    fn bridge_response_success() {
        let json = r#"{"success": true, "message": "Regenerated 49 chunks around (0, 0)"}"#;
        let resp: BridgeResponse = serde_json::from_str(json).unwrap();
        assert!(resp.success);
        assert!(resp.message.contains("Regenerated"));
    }

    #[test]
    fn bridge_response_round_trip() {
        let original = BridgeResponse {
            success: false,
            message: "Something failed".into(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let parsed: BridgeResponse = serde_json::from_str(&json).unwrap();
        assert!(!parsed.success);
        assert_eq!(parsed.message, "Something failed");
    }

    // ── PlayerInfo ───────────────────────────────────────────────────

    #[test]
    fn player_info_full() {
        let json = r#"{
            "name": "Steve",
            "uuid": "550e8400-e29b-41d4-a716-446655440000",
            "x": 100.5,
            "y": 64.0,
            "z": -200.3,
            "world": "MainWorld"
        }"#;
        let info: PlayerInfo = serde_json::from_str(json).unwrap();
        assert_eq!(info.name, "Steve");
        assert_eq!(info.uuid, "550e8400-e29b-41d4-a716-446655440000");
        assert_eq!(info.x, Some(100.5));
        assert_eq!(info.y, Some(64.0));
        assert_eq!(info.z, Some(-200.3));
        assert_eq!(info.world.as_deref(), Some("MainWorld"));
    }

    #[test]
    fn player_info_minimal() {
        // The Java handler may omit x/y/z/world if position lookup fails
        let json = r#"{"name": "Alex", "uuid": "12345678-1234-1234-1234-123456789abc"}"#;
        let info: PlayerInfo = serde_json::from_str(json).unwrap();
        assert_eq!(info.name, "Alex");
        assert!(info.x.is_none());
        assert!(info.y.is_none());
        assert!(info.z.is_none());
        assert!(info.world.is_none());
    }

    #[test]
    fn player_info_partial_position() {
        // Position present but world absent
        let json = r#"{
            "name": "Steve",
            "uuid": "550e8400-e29b-41d4-a716-446655440000",
            "x": 0.0,
            "y": 128.0,
            "z": 0.0
        }"#;
        let info: PlayerInfo = serde_json::from_str(json).unwrap();
        assert_eq!(info.x, Some(0.0));
        assert_eq!(info.y, Some(128.0));
        assert!(info.world.is_none());
    }

    // ── ChunkRegenRequest ────────────────────────────────────────────

    #[test]
    fn chunk_regen_request_serialize() {
        let req = ChunkRegenRequest {
            x: -5,
            z: 10,
            radius: 3,
        };
        let json = serde_json::to_value(&req).unwrap();
        assert_eq!(json["x"], -5);
        assert_eq!(json["z"], 10);
        assert_eq!(json["radius"], 3);
    }

    #[test]
    fn chunk_regen_request_round_trip() {
        let json = r#"{"x": 0, "z": 0, "radius": 3}"#;
        let req: ChunkRegenRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.x, 0);
        assert_eq!(req.z, 0);
        assert_eq!(req.radius, 3);
    }

    // ── TeleportRequest (camelCase) ──────────────────────────────────

    #[test]
    fn teleport_request_serializes_camel_case() {
        let req = TeleportRequest {
            player_name: "Steve".into(),
            x: 100.0,
            y: 64.0,
            z: -200.0,
        };
        let json = serde_json::to_value(&req).unwrap();
        // Must be "playerName" not "player_name" to match Java server
        assert_eq!(json["playerName"], "Steve");
        assert_eq!(json["x"], 100.0);
        assert_eq!(json["y"], 64.0);
        assert_eq!(json["z"], -200.0);
        // Ensure snake_case key does NOT exist
        assert!(json.get("player_name").is_none());
    }

    #[test]
    fn teleport_request_deserializes_camel_case() {
        let json = r#"{"playerName": "Alex", "x": 50.0, "y": 70.0, "z": 30.0}"#;
        let req: TeleportRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.player_name, "Alex");
        assert_eq!(req.x, 50.0);
    }

    // ── BridgeClient construction ────────────────────────────────────

    #[test]
    fn client_new_builds_base_url() {
        let client = BridgeClient::new("127.0.0.1", 7854, "test-token").unwrap();
        assert_eq!(client.base_url, "http://127.0.0.1:7854");
        assert_eq!(client.auth_token, "test-token");
    }

    #[test]
    fn client_new_accepts_localhost() {
        let client = BridgeClient::new("localhost", 9999, "abc123").unwrap();
        assert_eq!(client.base_url, "http://localhost:9999");
        assert_eq!(client.auth_token, "abc123");
    }

    #[test]
    fn client_new_accepts_ipv6_loopback() {
        let client = BridgeClient::new("::1", 7854, "token").unwrap();
        assert_eq!(client.base_url, "http://::1:7854");
    }

    #[test]
    fn client_new_rejects_non_loopback() {
        let result = BridgeClient::new("192.168.1.100", 9999, "abc123");
        match result {
            Err(e) => assert!(e.contains("loopback"), "unexpected error: {}", e),
            Ok(_) => panic!("expected loopback rejection"),
        }
    }

    #[test]
    fn client_new_rejects_external_host() {
        let result = BridgeClient::new("evil.example.com", 80, "token");
        match result {
            Err(e) => assert!(e.contains("loopback"), "unexpected error: {}", e),
            Ok(_) => panic!("expected loopback rejection"),
        }
    }

    // ── BridgeState ──────────────────────────────────────────────────

    #[test]
    fn bridge_state_default_is_disconnected() {
        let state = BridgeState::default();
        let lock = state.0.try_lock().unwrap();
        assert!(lock.is_none());
    }

    // ── sync_file ────────────────────────────────────────────────────

    #[test]
    fn sync_file_copies_content() {
        let dir = std::env::temp_dir().join("terranova_test_sync");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let src = dir.join("source.json");
        std::fs::write(&src, r#"{"hello": "world"}"#).unwrap();

        let dest = dir.join("nested").join("dest.json");
        BridgeClient::sync_file(
            src.to_str().unwrap(),
            dest.to_str().unwrap(),
        )
        .unwrap();

        let content = std::fs::read_to_string(&dest).unwrap();
        assert_eq!(content, r#"{"hello": "world"}"#);

        // Cleanup
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn sync_file_creates_parent_dirs() {
        let dir = std::env::temp_dir().join("terranova_test_sync_nested");
        let _ = std::fs::remove_dir_all(&dir);

        let src = std::env::temp_dir().join("terranova_test_sync_nested_src.txt");
        std::fs::write(&src, "test content").unwrap();

        let dest = dir.join("a").join("b").join("c").join("file.txt");
        BridgeClient::sync_file(
            src.to_str().unwrap(),
            dest.to_str().unwrap(),
        )
        .unwrap();

        assert!(dest.exists());
        assert_eq!(std::fs::read_to_string(&dest).unwrap(), "test content");

        // Cleanup
        let _ = std::fs::remove_dir_all(&dir);
        let _ = std::fs::remove_file(&src);
    }

    #[test]
    fn sync_file_nonexistent_source_errors() {
        let result = BridgeClient::sync_file(
            "/tmp/terranova_nonexistent_file_12345.txt",
            "/tmp/terranova_dest_12345.txt",
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Failed to copy file"));
    }
}
