pub struct Config {
    pub amqp_host: String,
    pub amqp_port: u16,
    pub amqp_username: String,
    pub amqp_password: Option<String>,
    pub amqp_vhost: String,
    pub gcs_bucket: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            amqp_host: std::env::var("RABBITMQ_HOST").unwrap_or_else(|_| "127.0.0.1".into()),
            amqp_port: std::env::var("RABBITMQ_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(5672),
            amqp_username: std::env::var("RABBITMQ_USERNAME").unwrap_or_else(|_| "doggo".into()),
            amqp_password: std::env::var("RABBITMQ_PASSWORD").ok(),
            amqp_vhost: std::env::var("RABBITMQ_VHOST").unwrap_or_else(|_| "/".into()),
            gcs_bucket: std::env::var("GCS_BUCKET_NAME").expect("GCS_BUCKET_NAME must be set"),
        }
    }

    pub fn amqp_addr(&self) -> String {
        let auth = match &self.amqp_password {
            Some(password) => format!("{}:{}", self.amqp_username, password),
            None => self.amqp_username.clone(),
        };
        format!(
            "amqp://{}@{}:{}/{}",
            auth,
            self.amqp_host,
            self.amqp_port,
            self.amqp_vhost.trim_start_matches('/')
        )
    }
}
