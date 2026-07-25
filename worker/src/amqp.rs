// worker/src/amqp.rs
use lapin::{
    options::*, types::FieldTable, BasicProperties, Channel, Connection, ConnectionProperties,
};

pub const REQUESTS_QUEUE: &str = "mission-report.requests";
pub const RESPONSES_QUEUE: &str = "mission-report.responses";

pub async fn connect(addr: &str) -> lapin::Result<Channel> {
    let connection = Connection::connect(addr, ConnectionProperties::default()).await?;
    let channel = connection.create_channel().await?;

    channel
        .queue_declare(
            REQUESTS_QUEUE.into(),
            QueueDeclareOptions { durable: true, ..Default::default() },
            FieldTable::default(),
        )
        .await?;
    channel
        .queue_declare(
            RESPONSES_QUEUE.into(),
            QueueDeclareOptions { durable: true, ..Default::default() },
            FieldTable::default(),
        )
        .await?;

    Ok(channel)
}

pub async fn publish_response(channel: &Channel, body: &[u8]) -> lapin::Result<()> {
    channel
        .basic_publish(
            "".into(),
            RESPONSES_QUEUE.into(),
            BasicPublishOptions::default(),
            body,
            BasicProperties::default().with_delivery_mode(2),
        )
        .await?
        .await?;
    Ok(())
}
