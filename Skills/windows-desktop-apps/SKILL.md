---
name: windows-desktop-apps
description: Build top-tier Windows desktop applications — Electron, WPF, WinUI, packaging, installers, RTX GPU/Electron fixes. Use when Robert asks for a Windows desktop app, Electron app, WPF, installer, .exe, Start Menu app, or native Windows UI.
---

# Windows Desktop Apps (Elite)

Build production Windows desktop software that feels premium and ships as a real installer, not a half-finished script.

## Choose the stack

| Need | Stack |
|------|--------|
| Modern web-like UI + local files/AI | **Electron + electron-vite + React + TypeScript** |
| Native Windows look, .NET shop | **WPF (.NET 8)** or **WinUI 3** |
| Small utility, no heavy UI | **Python + PySide6** or **C# console + tray** |

Default for Bobby's Tech polished tools: **Electron + React + TypeScript** unless Robert asks for WPF.

## Electron iron rules

1. **Security:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. Expose APIs only via `contextBridge` in preload.
2. **IPC:** typed `ipcMain.handle` / `ipcRenderer.invoke` — never expose raw `ipcRenderer`.
3. **Build:** electron-vite for dev; Electron Forge or electron-builder for packages.
4. **Installer:** produce Setup.exe (NSIS or Squirrel) with Start Menu shortcut + uninstaller.
5. **Auto-update:** plan electron-updater when distributing.
6. **RTX 5090 / NVIDIA:** Robert's PC can artifact/flash on Electron. Before `app.whenReady()`, disable hardware acceleration or apply known GPU workarounds when he reports flashing.
7. **Paths:** quote Windows paths with spaces; prefer `path.join` and `app.getPath('userData')`.

## WPF / WinUI iron rules

1. .NET 8+, MVVM (CommunityToolkit.Mvvm).
2. Never block UI thread — use async for IO/network.
3. Self-contained single-file publish when he wants one .exe.
4. Inno Setup or MSIX for real installers when shipping.

## Visual software design (desktop)

- Dark or light theme with clear CSS/XAML tokens (not random purple gradients).
- One primary action per screen.
- Keyboard shortcuts for power users.
- Accessible contrast; readable fonts.
- Smooth transitions without jank; 60fps target on his RTX machine.

## Done when

1. App launches on Windows 11
2. Core flows work without console errors
3. Build produces installable artifact or clear run instructions
4. README: how to run and how to build installer
5. No TODOs left in main paths

## Also use

- `frontend-ui-engineering`, `frontend-design`, `impeccable` for UI
- `verification-before-completion` before saying done
- `working-with-robert` for tone
