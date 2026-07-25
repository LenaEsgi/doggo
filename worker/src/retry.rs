use std::future::Future;
use std::time::Duration;

pub async fn with_backoff<F, Fut, T>(delays_between_retries: &[Duration], operation: F) -> anyhow::Result<T>
where
    F: Fn() -> Fut,
    Fut: Future<Output = anyhow::Result<T>>,
{
    let mut last_error = None;

    match operation().await {
        Ok(value) => return Ok(value),
        Err(err) => last_error = Some(err),
    }

    for delay in delays_between_retries {
        tokio::time::sleep(*delay).await;
        match operation().await {
            Ok(value) => return Ok(value),
            Err(err) => last_error = Some(err),
        }
    }

    Err(last_error.expect("at least one attempt always runs"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};
    use std::time::Duration;

    #[tokio::test]
    async fn retries_until_success_within_attempts() {
        let counter = AtomicU32::new(0);
        let result = with_backoff(&[Duration::from_millis(1), Duration::from_millis(1)], || async {
            let attempt = counter.fetch_add(1, Ordering::SeqCst);
            if attempt < 2 {
                anyhow::bail!("transient failure")
            }
            Ok(42)
        })
        .await;

        assert_eq!(result.unwrap(), 42);
        assert_eq!(counter.load(Ordering::SeqCst), 3);
    }

    #[tokio::test]
    async fn gives_up_after_exhausting_attempts() {
        let result: anyhow::Result<u32> = with_backoff(&[Duration::from_millis(1)], || async {
            anyhow::bail!("always fails")
        })
        .await;

        assert!(result.is_err());
    }
}
