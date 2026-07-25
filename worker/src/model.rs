use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
pub struct MissionReportStep {
    pub name: String,
    pub status: String,
    pub order: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MissionReportRequest {
    #[serde(rename = "missionRunId")]
    pub mission_run_id: String,
    #[serde(rename = "missionName")]
    pub mission_name: String,
    #[serde(rename = "robotDogName")]
    pub robot_dog_name: String,
    pub status: String,
    #[serde(rename = "startedAt")]
    pub started_at: String,
    #[serde(rename = "endedAt")]
    pub ended_at: Option<String>,
    pub steps: Vec<MissionReportStep>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "status")]
pub enum MissionReportResponse {
    #[serde(rename = "SUCCESS")]
    Success {
        #[serde(rename = "missionRunId")]
        mission_run_id: String,
        #[serde(rename = "gcsObjectPath")]
        gcs_object_path: String,
    },
    #[serde(rename = "FAILED")]
    Failed {
        #[serde(rename = "missionRunId")]
        mission_run_id: String,
        reason: String,
    },
}
