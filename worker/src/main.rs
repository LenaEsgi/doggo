mod config;
mod model;

fn main() {
    let _ = config::Config::from_env;
    println!("Hello, world!");
}
