use tauri::{AppHandle, Emitter};

/// Called from the popover window when the user expands into the full window.
/// Hands the current editor contents to the main window via an app-wide event
/// and brings that window to front.
#[tauri::command]
pub fn expand_to_main(app: AppHandle, code: String) -> Result<(), String> {
    app.emit("mermlaid://code-sync", code)
        .map_err(|e| e.to_string())?;
    crate::tray::open_main_window(&app);
    Ok(())
}

#[tauri::command]
pub fn set_hotkey(app: AppHandle, hotkey: String) -> Result<(), String> {
    crate::tray::set_hotkey(&app, hotkey)
}
