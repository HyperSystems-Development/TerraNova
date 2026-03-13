use std::time::Duration;
use tokio::sync::Mutex;

use reqwest::Client;

use super::types::*;

#[derive(Clone)]
pub struct BridgeClient {
    http: Client,
    pub(crate) base_url: String,
    pub(crate) auth_token: String,
}

pub struct BridgeState(pub Mutex<Option<BridgeClient>>);

impl Default for BridgeState {
    fn default() -> Self {
        BridgeState(Mutex::new(None))
    }
}

impl BridgeState {
    /// Clone the client out of the mutex so callers can drop the lock before HTTP calls.
    pub async fn get_client(&self) -> Result<BridgeClient, String> {
        let lock = self.0.lock().await;
        lock.as_ref().cloned().ok_or_else(|| "Not connected to bridge".to_string())
    }
}

impl BridgeClient {
    pub fn new(host: &str, port: u16, auth_token: &str) -> Result<Self, String> {
        let http = Client::builder()
            .connect_timeout(Duration::from_secs(3))
            .timeout(Duration::from_secs(8))
            .build()
            .map_err(|e| format!("Failed to build HTTP client: {}", e))?;
        Ok(Self {
            http,
            base_url: format!("http://{}:{}", host, port),
            auth_token: auth_token.to_string(),
        })
    }

    pub async fn status(&self) -> Result<ServerStatus, String> {
        self.http
            .get(format!("{}/api/status", self.base_url))
            .bearer_auth(&self.auth_token)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .json::<ServerStatus>()
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn reload_worldgen(&self) -> Result<BridgeResponse, String> {
        self.http
            .post(format!("{}/api/worldgen/reload", self.base_url))
            .bearer_auth(&self.auth_token)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .json::<BridgeResponse>()
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn regenerate_chunks(
        &self,
        x: i32,
        z: i32,
        radius: u32,
    ) -> Result<BridgeResponse, String> {
        let body = ChunkRegenRequest { x, z, radius };
        self.http
            .post(format!("{}/api/chunks/regenerate", self.base_url))
            .bearer_auth(&self.auth_token)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .json::<BridgeResponse>()
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn teleport(
        &self,
        player_name: &str,
        x: f64,
        y: f64,
        z: f64,
    ) -> Result<BridgeResponse, String> {
        let body = TeleportRequest {
            player_name: player_name.to_string(),
            x,
            y,
            z,
        };
        self.http
            .post(format!("{}/api/player/teleport", self.base_url))
            .bearer_auth(&self.auth_token)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .json::<BridgeResponse>()
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn fetch_palette(&self) -> Result<BlockPaletteResponse, String> {
        self.http
            .get(format!("{}/api/blocks/palette", self.base_url))
            .bearer_auth(&self.auth_token)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .json::<BlockPaletteResponse>()
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn fetch_chunk(
        &self,
        chunk_x: i32,
        chunk_z: i32,
        y_min: i32,
        y_max: i32,
        force_load: bool,
    ) -> Result<ChunkDataResponse, String> {
        let body = ChunkDataRequest {
            chunk_x,
            chunk_z,
            y_min,
            y_max,
            force_load,
        };
        let mut req = self
            .http
            .post(format!("{}/api/chunks/data", self.base_url))
            .bearer_auth(&self.auth_token)
            .json(&body);

        // Override client-level 8s timeout when force-loading (server may take up to 15s)
        if force_load {
            req = req.timeout(Duration::from_secs(20));
        }

        let response = req
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !response.status().is_success() {
            let status = response.status().as_u16();
            let body = response.text().await.unwrap_or_default();
            return Err(format!("HTTP {}: {}", status, body));
        }

        response
            .json::<ChunkDataResponse>()
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn player_info(&self) -> Result<PlayerInfo, String> {
        self.http
            .get(format!("{}/api/player/info", self.base_url))
            .bearer_auth(&self.auth_token)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .json::<PlayerInfo>()
            .await
            .map_err(|e| e.to_string())
    }

    pub fn sync_file(source_path: &str, dest_path: &str) -> Result<(), String> {
        let dest = std::path::Path::new(dest_path);
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directories: {}", e))?;
        }
        std::fs::copy(source_path, dest_path)
            .map_err(|e| format!("Failed to copy file: {}", e))?;
        Ok(())
    }
}
