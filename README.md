# Ultra Skills Editor

<p align="center">
  <img src="https://raw.githubusercontent.com/Michael-IT001/ultra-skills-editor/main/media/intro-demo.gif" alt="Ultra Skills Editor demo" width="100%" />
</p>

<p align="center">
  <strong>Smart Grouping</strong> ·
  <strong>Batch @ Copy</strong> ·
  <strong>Favorites</strong> ·
  <strong>Global / Project Import</strong> ·
  <strong>16 Languages</strong>
</p>

> Local-first skill manager for **VS Code, Cursor, Trae (Global & CN), Windsurf, Antigravity, Qoder, and CodeBuddy**.  
> Create, edit, import, organize, favorite, and batch-copy skills from one panel.

---

## Quick Start

1. Open the editor from the status bar, the command palette, or the explorer context menu.
2. Hold `Shift` and drag `.md` / `.mdc` files or folders into the panel to batch import them.
3. Use the `@` cart to copy selected skills, star important ones with Favorites, and press `Ctrl/Cmd + S` to save instantly.

---

## Core Workflows

### Smart Grouping

![Smart Grouping button inside Ultra Skills Editor](https://raw.githubusercontent.com/Michael-IT001/ultra-skills-editor/main/media/smart-grouping.png)

Clean up a messy skill library in one click. Smart Grouping automatically sorts ungrouped skills into practical sections such as Frontend, Backend, AI, Testing, and Docs.

- Useful right after large imports.
- Keeps the sidebar readable with visible group counts.
- Works naturally with later drag-and-drop refinement.

### Batch `@` Copy + Favorites

![Selected skills with batch @ copy and favorite stars](https://raw.githubusercontent.com/Michael-IT001/ultra-skills-editor/main/media/clipboard-favorites.png)

Select multiple skills with the `@` cart workflow to copy them into the clipboard as markdown-ready references, then star important ones to keep them close at hand.

- Batch copy selected skills for chat or prompt building.
- Favorite high-value skills for quick recall.
- Combine with **Recent / Favorite / Global / Project** filters for faster browsing.

### Batch Import with Destination Choice

![Batch import modal with Global and Project destination choice](https://raw.githubusercontent.com/Michael-IT001/ultra-skills-editor/main/media/batch-import-destination.png)

Drop in multiple files or folders, preview how many skills will be created, choose how to handle naming conflicts, and decide whether the import should be saved as **Global** or only for the **current project**.

- Supports drag-and-drop and toolbar import.
- Shows a batch preview before committing.
- Lets you choose the destination per import session.

---

## More Features

- **Group drag-and-drop**: Reorder skills and groups directly in the sidebar.
- **Group multi-select**: Use `Shift + Click` on group labels to move multiple groups together.
- **Batch export**: Export entire skill folders, not just a single markdown file.
- **Duplicate**: Clone an existing skill to reuse it as a template.
- **Keyboard shortcut**: Toggle the editor with `Cmd + Shift + K` on Mac or `Ctrl + Shift + K` on Windows.

---

## Supported Languages

🇺🇸 English · 🇨🇳 简体中文 · 🇹🇼 繁體中文 · 🇯🇵 日本語  
🇩🇪 Deutsch · 🇪🇸 Español · 🇫🇷 Français · 🇮🇹 Italiano  
🇰🇷 한국어 · 🇧🇷 Português · 🇷🇺 Русский · 🇹🇷 Türkçe  
🇵🇱 Polski · 🇨🇿 Čeština · 🇸🇦 العربية · 🇻🇳 Tiếng Việt

The interface follows the editor language on first launch, and you can switch it later from the language selector in the sidebar footer.

---

## Installation

1. Download the latest `.vsix` from the [Releases](https://github.com/Michael-IT001/antigravity-skills-editor/releases) page.
2. Open the Extensions panel in Antigravity, Cursor, or another supported editor.
3. Open the extensions menu and choose **Install from VSIX...**.
4. Select the package and reload the window.

---

## Storage Routing

- **Antigravity / Gemini**: Global `~/.gemini/antigravity/skills/` · Project `.agents/skills/`
- **Cursor**: Global `~/.cursor/skills/` · Project `.agents/skills/`
- **Windsurf**: Global `~/.codeium/windsurf/skills/` · Project `.windsurf/skills/`
- **Trae (Global)**: Global `~/.trae/skills/` · Project `.trae/skills/`
- **Trae CN (国内版)**: Global `~/.trae-cn/skills/` · Project `.trae/skills/`
- **VS Code**: Global `~/.copilot/skills/` · Project `.agents/skills/`
- **Qoder**: Global `~/.qoder/skills/` · Project `.agents/skills/`
- **CodeBuddy**: Global `~/.codebuddy/skills/` · Project `.agents/skills/`

Windows paths are mapped automatically to the corresponding `%USERPROFILE%` locations.

---

## Security & Privacy

- **100% Local**: Skill processing, file operations, and grouping run locally.
- **No External Calls**: The extension does not send your skills, file paths, or workspace data to external services.
- **No Telemetry**: Your usage stays inside your editor and filesystem.

---

## License

This project is licensed under the [MIT License](https://github.com/Michael-IT001/antigravity-skills-editor/blob/main/LICENSE).
