// Убирает лишнее консольное окно в релизной сборке под Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{
    image::Image,
    menu::{CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_notification::NotificationExt;

const TRAY_WORK: &[u8] = include_bytes!("../icons/tray-work.png");
const TRAY_REST: &[u8] = include_bytes!("../icons/tray-rest.png");

/// Помним, мы ли развернули окно на перерыв.
/// Если окно открыл сам пользователь — прятать его при возврате к работе нельзя.
struct Grabbed(AtomicBool);

fn show_window(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

/// Начался перерыв: развернуть окно на весь экран поверх всех программ.
#[tauri::command]
fn enter_rest(app: tauri::AppHandle, state: tauri::State<'_, Grabbed>) {
    state.0.store(true, Ordering::SeqCst);
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_always_on_top(true);
        let _ = w.set_fullscreen(true);
        let _ = w.set_focus();
    }
}

/// Перерыв кончился: вернуть окно в обычный вид.
/// Прячем в трей только если разворачивали его мы сами.
#[tauri::command]
fn enter_work(app: tauri::AppHandle, state: tauri::State<'_, Grabbed>) {
    let was_grabbed = state.0.swap(false, Ordering::SeqCst);
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.set_fullscreen(false);
        let _ = w.set_always_on_top(false);
        if was_grabbed {
            let _ = w.hide();
        }
    }
}

#[tauri::command]
fn notify(app: tauri::AppHandle, title: String, body: String) {
    let _ = app
        .notification()
        .builder()
        .title(title)
        .body(body)
        .show();
}

/// Подсказка и цвет иконки в трее: янтарная — работа, зелёная — перерыв.
#[tauri::command]
fn set_tray(app: tauri::AppHandle, phase: String, tooltip: String) {
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_tooltip(Some(tooltip.as_str()));
        let bytes: &[u8] = if phase == "rest" { TRAY_REST } else { TRAY_WORK };
        if let Ok(img) = Image::from_bytes(bytes) {
            let _ = tray.set_icon(Some(img));
        }
    }
}

fn main() {
    tauri::Builder::default()
        // Второй запуск не создаёт вторую иконку в трее, а показывает окно первой копии.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            show_window(app);
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(Grabbed(AtomicBool::new(false)))
        .invoke_handler(tauri::generate_handler![
            enter_rest, enter_work, notify, set_tray
        ])
        .setup(|app| {
            let autostart_on = app.autolaunch().is_enabled().unwrap_or(false);

            let show_i = MenuItemBuilder::with_id("show", "Показать окно").build(app)?;
            let auto_i = CheckMenuItemBuilder::with_id("autostart", "Запускать при старте Windows")
                .checked(autostart_on)
                .build(app)?;
            let quit_i = MenuItemBuilder::with_id("quit", "Выход").build(app)?;

            let menu = MenuBuilder::new(app)
                .items(&[&show_i, &auto_i])
                .separator()
                .items(&[&quit_i])
                .build()?;

            let auto_handle = auto_i.clone();

            TrayIconBuilder::with_id("main")
                .icon(Image::from_bytes(TRAY_WORK)?)
                .tooltip("Передышка")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "show" => show_window(app),
                    "autostart" => {
                        let mgr = app.autolaunch();
                        let enabled = mgr.is_enabled().unwrap_or(false);
                        let _ = if enabled { mgr.disable() } else { mgr.enable() };
                        let now_on = mgr.is_enabled().unwrap_or(false);
                        let _ = auto_handle.set_checked(now_on);
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        // Крестик прячет окно в трей, а не закрывает программу.
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("не удалось запустить приложение");
}
