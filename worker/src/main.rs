mod config;
mod model;
mod pdf;

fn main() {
    let _ = config::Config::from_env;
    println!("Hello, world!");
}
