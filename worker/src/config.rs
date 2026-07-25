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
        // RabbitMQ's default vhost is literally named "/". In an AMQP URI the vhost is
        // encoded as the path segment following host:port, so it must be sent percent-encoded
        // (e.g. "%2F"), never as an empty segment: `amqp://host:port/` parses to vhost ""
        // (a different, nonexistent vhost), not "/" (see amq-protocol-uri's AMQPUri::from_str,
        // which decodes the path via `url.path().get(1..)`). Percent-encoding every `/` in the
        // vhost (including the default vhost itself, which is just "/") handles both the
        // default case and any non-default vhost name that happens to contain slashes.
        let vhost_segment = self.amqp_vhost.replace('/', "%2F");
        format!(
            "amqp://{}@{}:{}/{}",
            auth, self.amqp_host, self.amqp_port, vhost_segment
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use amq_protocol_uri::AMQPUri;
    use std::str::FromStr;

    fn base_config() -> Config {
        Config {
            amqp_host: "127.0.0.1".to_string(),
            amqp_port: 5672,
            amqp_username: "doggo".to_string(),
            amqp_password: Some("doggo_password".to_string()),
            amqp_vhost: "/".to_string(),
            gcs_bucket: "doggo-mission-reports".to_string(),
        }
    }

    #[test]
    fn amqp_addr_encodes_default_vhost_as_percent_2f() {
        let config = base_config();
        let addr = config.amqp_addr();

        // The literal string must not degrade to an empty/omitted path segment.
        assert_eq!(addr, "amqp://doggo:doggo_password@127.0.0.1:5672/%2F");

        // And, crucially, parsing it back through the same URI parser the `lapin`/
        // `amq-protocol` client uses must yield the default vhost "/", not "".
        let parsed = AMQPUri::from_str(&addr).expect("amqp_addr() must produce a valid AMQP URI");
        assert_eq!(parsed.vhost, "/");
    }

    #[test]
    fn amqp_addr_percent_encodes_slashes_in_non_default_vhost() {
        let mut config = base_config();
        config.amqp_vhost = "my/vhost".to_string();
        let addr = config.amqp_addr();

        assert_eq!(addr, "amqp://doggo:doggo_password@127.0.0.1:5672/my%2Fvhost");

        let parsed = AMQPUri::from_str(&addr).expect("amqp_addr() must produce a valid AMQP URI");
        assert_eq!(parsed.vhost, "my/vhost");
    }
}
