use google_cloud_storage::client::Storage;

pub async fn upload(bucket: &str, object_name: &str, bytes: Vec<u8>) -> anyhow::Result<()> {
    let client = Storage::builder().build().await?;
    client
        .write_object(
            format!("projects/_/buckets/{bucket}"),
            object_name,
            bytes::Bytes::from(bytes),
        )
        .send_unbuffered()
        .await?;
    Ok(())
}
