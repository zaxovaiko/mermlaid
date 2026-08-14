use std::sync::Mutex;

use tauri::{
    image::Image,
    menu::MenuBuilder,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Emitter, Manager, WindowEvent,
};

#[cfg(desktop)]
use tauri_plugin_positioner::{Position, WindowExt};

const TRAY_ICON_BYTES: &[u8] = include_bytes!("../icons/tray-icon.png");
pub(crate) const DEFAULT_HOTKEY: &str = "CmdOrCtrl+Shift+M";

struct HotkeyState(Mutex<Option<String>>);

pub fn setup(app: &App) -> tauri::Result<()> {
    #[cfg(target_os = "macos")]
    app.handle().set_dock_visibility(false)?;

    #[cfg(desktop)]
    {
        app.handle().plugin(tauri_plugin_positioner::init())?;

        use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
        app.handle().plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_popover(app);
                    }
                })
                .build(),
        )?;
        app.manage(HotkeyState(Mutex::new(None)));
        if app.global_shortcut().register(DEFAULT_HOTKEY).is_ok() {
            *app.state::<HotkeyState>().0.lock().unwrap() = Some(DEFAULT_HOTKEY.into());
        }
    }

    let menu = MenuBuilder::new(app)
        .text("open_window", "Open Window")
        .separator()
        .text("about", "About Mermlaid")
        .separator()
        .text("quit", "Quit Mermlaid")
        .build()?;

    TrayIconBuilder::new()
        .icon(Image::from_bytes(TRAY_ICON_BYTES)?)
        .icon_as_template(true)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open_window" => open_main_window(app),
            "about" => {
                open_main_window(app);
                let _ = app.emit("mermlaid://show-about", ());
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            #[cfg(desktop)]
            tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);

            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_popover(tray.app_handle());
            }
        })
        .build(app)?;

    if let Some(popover) = app.get_webview_window("popover") {
        #[cfg(target_os = "macos")]
        {
            use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};
            // Native NSVisualEffectView blur: unlike a CSS backdrop-filter on a
            // transparent window, this is a real AppKit layer that AppKit itself
            // keeps in sync when the window is resized, so it never leaves a
            // stale unblurred patch behind.
            let _ = apply_vibrancy(
                &popover,
                NSVisualEffectMaterial::Popover,
                Some(NSVisualEffectState::Active),
                Some(16.0),
            );
        }

        let popover_for_blur = popover.clone();
        popover.on_window_event(move |event| {
            if let WindowEvent::Focused(false) = event {
                let _ = popover_for_blur.hide();
            }
        });
    }

    if let Some(main) = app.get_webview_window("main") {
        let app_handle = app.handle().clone();
        main.on_window_event(move |event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                if let Some(w) = app_handle.get_webview_window("main") {
                    let _ = w.hide();
                }
                #[cfg(target_os = "macos")]
                let _ = app_handle.set_dock_visibility(false);
            }
        });
    }

    Ok(())
}

pub(crate) fn set_hotkey(app: &AppHandle, hotkey: String) -> Result<(), String> {
    let hotkey = hotkey.trim().to_owned();
    if hotkey.is_empty() {
        return Err("Choose a shortcut with Command or Control.".into());
    }

    #[cfg(desktop)]
    {
        use tauri_plugin_global_shortcut::GlobalShortcutExt;

        let state = app.state::<HotkeyState>();
        let mut current = state.0.lock().map_err(|_| "Hotkey state is unavailable.")?;
        if current.as_deref() == Some(hotkey.as_str()) {
            return Ok(());
        }

        app.global_shortcut()
            .register(hotkey.as_str())
            .map_err(|error| format!("Could not register {hotkey}: {error}"))?;
        if let Some(previous) = current.replace(hotkey) {
            let _ = app.global_shortcut().unregister(previous.as_str());
        }
    }

    Ok(())
}

fn toggle_popover(app: &AppHandle) {
    let Some(window) = app.get_webview_window("popover") else {
        return;
    };
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
        return;
    }
    #[cfg(desktop)]
    let _ = window.as_ref().window().move_window(Position::TrayCenter);
    let _ = window.show();
    let _ = window.set_focus();
}

pub(crate) fn open_main_window(app: &AppHandle) {
    if let Some(popover) = app.get_webview_window("popover") {
        let _ = popover.hide();
    }
    #[cfg(target_os = "macos")]
    let _ = app.set_dock_visibility(true);
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}
