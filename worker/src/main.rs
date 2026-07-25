mod config;
mod model;
mod pdf;
mod retry;
mod storage;

fn main() {
    let _ = config::Config::from_env;
    println!("Hello, world!");
}
