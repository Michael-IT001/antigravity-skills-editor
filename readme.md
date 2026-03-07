# 🧠 Ultra Skills Editor v2.0

> A beautifully crafted, multi-language skills management extension for **VSCode**, **Cursor**, **Trae**, **Antigravity**, **Qoder**, **Windsurf**, & **CodeBuddy**.  
> Create, edit, search, preview, import, export, and organize your AI skills — all from a single, elegant panel.

---

## 💡 How to Open the Editor
1. **Status Bar (Recommended)**: Look at the bottom right of your IDE's status bar for `🔧 My Skills`. Click it!
2. **Right-Click Menu**: Right-click on any `.md` file or folder → **"Import as Skill / 导入为技能"**
3. **Command Palette**: `Cmd+Shift+P` → type `Open Skills Editor` → Enter
4. **Keyboard Shortcut**: `Cmd+Shift+K` (Mac) / `Ctrl+Shift+K` (Windows/Linux)

> 💡 **PRO TIP: Shift + Drag to Import**  
> Hold down `Shift` and drag `.md` files directly into the panel to import them!

---

## ✨ What's New in v2.0

| Feature | Description |
|---------|-------------|
| 🔍 **Search & Filter** | Real-time fuzzy search with type filter tabs (All / Global / Project) |
| 🖱️ **Context Menu** | Right-click any skill in the sidebar to quickly Rename or Delete it |
| ⌨️ **Keyboard Shortcuts** | `Cmd+F` search, `Cmd+N` new, `↑↓` navigate, `Tab` indent |
| 📤 **Export** | Export individual skills as `.md` files via toolbar button |
| 🎨 **Visual Polish** | Added description previews and total skills count in sidebar |
| 🚀 **Universal IDE Support** | Native workspace path resolution for VSCode, Cursor, Trae, Antigravity, Qoder, Windsurf, and CodeBuddy |

---

## ✨ Core Features

| Feature | Description |
|---------|-------------|
| 🛒 **@ Icon Cart** | Click `@` to toggle skills into clipboard. `Shift+Click` for range select. |
| 📱 **Adaptive UI** | Toolbars intelligently transform in narrow views. |
| 🌍 **16 Languages** | Auto-detects your editor language, or switch manually. |
| 📝 **Full Editor** | Monospace editor with Tab indent and `Cmd+S` quick save. |
| 🗂️ **Global + Project** | Skills scoped globally or per-project. |
| 📦 **Import** | `Shift + Drag` files or use the Import button. |
| 🗑️ **Safe Delete** | Confirmation dialogs prevent accidental loss. |

---

## 🌍 Supported Languages

| | | | |
|---|---|---|---|
| 🇺🇸 English | 🇨🇳 简体中文 | 🇹🇼 繁體中文 | 🇯🇵 日本語 |
| 🇩🇪 Deutsch | 🇪🇸 Español | 🇫🇷 Français | 🇮🇹 Italiano |
| 🇰🇷 한국어 | 🇧🇷 Português | 🇷🇺 Русский | 🇹🇷 Türkçe |
| 🇵🇱 Polski | 🇨🇿 Čeština | 🇸🇦 العربية | 🇻🇳 Tiếng Việt |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + F` | Focus search box |
| `Cmd/Ctrl + N` | Create new skill |
| `Cmd/Ctrl + S` | Save current skill |
| `↑` / `↓` | Navigate skill list |
| `Tab` | Indent in editor |
| `Cmd/Ctrl + Shift + K` | Open Skills Editor |

---

## 🚀 Getting Started

### Installation
1. Download the latest `.vsix` from [Releases](https://github.com/Michael-IT001/ultra-skills-editor/releases)
2. In Antigravity/Cursor, open Extensions panel
3. Click `...` → **"Install from VSIX..."**
4. Select the file and reload

---

## 📁 How Skills Are Stored

```
~/.cursor/skills/               ← Global skills (Cursor)
~/.trae/skills/                 ← Global skills (Trae)
~/.vscode/skills/               ← Global skills (VSCode)
... (etc for qoder, windsurf, codebuddy, antigravity)

<project>/.cursor/skills/       ← Project skills (Cursor)
<project>/.trae/skills/         ← Project skills (Trae)
<project>/.vscode/skills/       ← Project skills (VSCode)
<project>/.agent/skills/        ← Project skills (Antigravity)
...
```

---

## 🛠️ Project Structure

```
ultra-skills-editor/
├── package.json          # Extension manifest
├── README.md             # This file
├── CHANGELOG.md          # Version history
├── LICENSE               # MIT License
└── src/
    ├── extension.js      # Entry point & command registration
    ├── SkillsPanel.js    # Webview panel (UI + logic + templates)
    └── i18n.js           # 16-language translations
```

---

## 📄 License

[MIT License](https://github.com/Michael-IT001/ultra-skills-editor/blob/HEAD/LICENSE)

> **Made with ❤️ for the Antigravity community**
