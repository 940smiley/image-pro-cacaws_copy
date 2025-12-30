#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::{Manager, WindowBuilder, WindowUrl};

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      let window = WindowBuilder::new(app, "main", WindowUrl::default())
        .title("Image Pro")
        .inner_size(1200.0, 800.0)
        .resizable(true)
        .build()?;
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}