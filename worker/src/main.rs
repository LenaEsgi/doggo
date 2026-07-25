mod amqp;
mod config;
mod model;
mod pdf;
mod retry;
mod storage;

use futures_lite::stream::StreamExt;
use lapin::options::{BasicAckOptions, BasicConsumeOptions, BasicNackOptions};
use lapin::types::FieldTable;
use std::time::Duration;

use config::Config;
use model::{MissionReportRequest, MissionReportResponse};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let config = Config::from_env();
    let channel = amqp::connect(&config.amqp_addr()).await?;

    let mut consumer = channel
        .basic_consume(
            amqp::REQUESTS_QUEUE.into(),
            "mission-report-worker".into(),
            BasicConsumeOptions::default(),
            FieldTable::default(),
        )
        .await?;

    println!("mission-report-worker: en attente de messages sur {}", amqp::REQUESTS_QUEUE);

    while let Some(delivery) = consumer.next().await {
        let delivery = match delivery {
            Ok(delivery) => delivery,
            Err(err) => {
                eprintln!("erreur de livraison AMQP: {err}");
                continue;
            }
        };

        let request: MissionReportRequest = match serde_json::from_slice(&delivery.data) {
            Ok(request) => request,
            Err(err) => {
                eprintln!("message de requête invalide, rejeté sans requeue: {err}");
                if let Err(nack_err) =
                    delivery.nack(BasicNackOptions { requeue: false, ..Default::default() }).await
                {
                    eprintln!("échec du nack pour un message invalide: {nack_err}");
                }
                continue;
            }
        };

        let response = process_request(&config, &request).await;
        let body = serde_json::to_vec(&response)?;

        let publish_result = retry::with_backoff(&RETRY_DELAYS, || {
            let channel = channel.clone();
            let body = body.clone();
            async move { amqp::publish_response(&channel, &body).await.map_err(anyhow::Error::from) }
        })
        .await;

        if let Err(err) = publish_result {
            eprintln!(
                "échec de publication de la réponse pour {} après retries: {err}",
                request.mission_run_id
            );
        }

        if let Err(ack_err) = delivery.ack(BasicAckOptions::default()).await {
            eprintln!("échec de l'ack pour {}: {ack_err}", request.mission_run_id);
        }
    }

    Ok(())
}

const RETRY_DELAYS: [Duration; 2] = [Duration::from_secs(5), Duration::from_secs(30)];

async fn process_request(config: &Config, request: &MissionReportRequest) -> MissionReportResponse {
    let object_name = format!("mission-reports/{}.pdf", request.mission_run_id);
    let bucket = config.gcs_bucket.clone();
    let object_name_for_retry = object_name.clone();

    let result = retry::with_backoff(&RETRY_DELAYS, || {
        let bucket = bucket.clone();
        let object_name = object_name_for_retry.clone();
        let bytes = pdf::build(request);
        async move { storage::upload(&bucket, &object_name, bytes).await }
    })
    .await;

    match result {
        Ok(()) => MissionReportResponse::Success {
            mission_run_id: request.mission_run_id.clone(),
            gcs_object_path: object_name,
        },
        Err(err) => MissionReportResponse::Failed {
            mission_run_id: request.mission_run_id.clone(),
            reason: err.to_string(),
        },
    }
}
