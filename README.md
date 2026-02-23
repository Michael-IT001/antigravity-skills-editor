# 🧠 Antigravity Skills Editor

> A beautifully crafted, multi-language skills management extension for Antigravity & VS Code compatible editors.  
> Create, edit, import, and organize your AI skills — all from a single, elegant panel.

---

## ✨ Highlights

| Feature | Description |
|---------|-------------|
| 🛒 **@ Icon Cart** | Direct-to-clipboard selection. Clicking the `@` icon instantly toggles skills. |
| ⚡ **Multi-Select** | Use **Shift + Click** on icons to select ranges of skills in seconds. |
| 📱 **Adaptive UI** | Toolbars intelligently transform text to icons in narrow views to prevent overlap. |
| 🌍 **16 Languages** | Auto-detects your editor language, or switch manually with one click. |
| 📝 **Full Editor** | Built-in markdown editor with syntax-friendly monospace font. |
| 🗂️ **Global + Project** | Skills can be scoped globally (available everywhere) or per-project. |
| 📦 **Import** | Drag in `.md` files or entire skill folders from anywhere on your system. |
| 🗑️ **Safe Delete** | Confirmation dialogs prevent accidental data loss. |
| 💾 **Quick Save** | Press `Ctrl/Cmd + S` inside the editor to save instantly. |

---

## 📸 Screenshots

### Skill Editor Panel
The main interface features a sidebar with your skill list and a full-width editor area. Now featuring a universal **@ icon system** for clean selection.

### Adaptive Responsiveness
The UI intelligently adapts to window resizing. Button labels automatically collapse into icons when space is tight, and the path detail folds away to prioritize readability.

### Language Switcher
A globe icon in the sidebar footer lets you switch between 16 supported languages instantly.

---

## 🌍 Supported Languages

| | | | |
|---|---|---|---|
| 🇺🇸 English | 🇨🇳 简体中文 | 🇹🇼 繁體中文 | 🇯🇵 日本語 |
| 🇩🇪 Deutsch | 🇪🇸 Español | 🇫🇷 Français | 🇮🇹 Italiano |
| 🇰🇷 한국어 | 🇧🇷 Português | 🇷🇺 Русский | 🇹🇷 Türkçe |
| 🇵🇱 Polski | 🇨🇿 Čeština | 🇸🇦 العربية | 🇻🇳 Tiếng Việt |

The extension **automatically detects** your editor's display language on first launch. You can manually override it at any time using the language selector at the bottom of the sidebar — your preference is remembered across sessions.

---

## 🚀 Getting Started

### Installation

#### Manual Installation
1. Download the latest `.vsix` from the [Releases](https://github.com/Michael-IT001/antigravity-skills-editor/releases) page.
2. In Antigravity/VS Code, open the Extensions panel.
3. Click the "..." menu and select **"Install from VSIX..."**.
4. Select the downloaded file and reload the window.

### First Use
1. After installation, look for the **Skills** button in the bottom status bar.
2. Click it to open the Skills Editor panel.
3. Start creating your first skill!

---

## 📁 How Skills Are Stored

Each skill is a folder containing a `SKILL.md` file:

```
~/.antigravity/skills/          ← Global skills (available in all projects)
├── code-reviewer/
│   └── SKILL.md
├── test-writer/
│   └── SKILL.md
└── api-designer/
    └── SKILL.md

<your-project>/cursor_skills/   ← Project skills (only for this project)
├── project-helper/
│   └── SKILL.md
└── deploy-guide/
    └── SKILL.md
```

- **Global Skills** are stored in `~/.antigravity/skills/` and are accessible from any project.
- **Project Skills** are stored inside your workspace (e.g. `cursor_skills/`, `.agents/`, `.cursor/skills/`) and stay with the project.

---

## 📖 Feature Details

### Creating Skills
Click the **+** button in the sidebar header. A modal dialog will appear where you can:
- Enter a name for your skill
- Choose whether to save it as **Global** (available everywhere) or **Project** (local to the current workspace)

### Editing Skills
Click any skill in the sidebar to open it in the editor. The content is displayed in a monospace editor optimized for markdown. Press **Ctrl/Cmd + S** to quick-save, or click the **Save** button in the toolbar.

### Using the @ Icon Cart (Selection)
- **Direct Selection**: Click the `@` icon next to any skill in the sidebar to toggle its selection state. Selected skills turn blue.
- **Range Selection**: Hold the **Shift** key while clicking the `@` icons to select or deselect a range of skills instantly.
- **Clipboard Sync**: Your selection is automatically synced to the system clipboard as a list of Markdown links. Simply press `Cmd/Ctrl + V` in your chat to use them!

### Importing Skills
Click the **Import** button (archive icon) in the sidebar header. You can select:
- **Individual `.md` files** — they will be automatically wrapped into a proper skill folder with `SKILL.md`
- **Entire folders** — they will be copied as-is into your skills directory

After selecting files, you'll be prompted to choose the destination (Global or Project).

### Deleting Skills
Click the **red trash icon** in the editor toolbar. A confirmation dialog will appear to prevent accidental deletion. This action permanently removes the skill folder and its contents.

### Switching Languages
At the bottom of the sidebar, you'll find a 🌐 globe icon next to a dropdown menu. Select any of the 16 supported languages to instantly change the entire interface. Your preference is saved and will persist across editor restarts.

---

## 🛠️ Development

### Project Structure

```
antigravity-skills-editor/
├── package.json          # Extension manifest
├── README.md             # This file
├── CHANGELOG.md          # Version history
├── LICENSE               # MIT License
└── src/
    ├── extension.js      # Extension entry point & activation
    ├── SkillsPanel.js    # Webview panel (UI + logic)
    └── i18n.js           # Translation strings for 16 languages
```

### Running Locally
1. Open this folder in VS Code or Antigravity.
2. Press `F5` to launch the Extension Development Host.
3. In the new window, click the **Skills** button in the status bar.

### Building for Distribution
```bash
npm install -g @vscode/vsce    # or: npm install -g ovsx
vsce package                   # Creates a .vsix file
```

---

## 🤝 Contributing

Contributions are welcome! Here are some ways you can help:

- **🌐 Translations**: Improve existing translations or add new languages in `src/i18n.js`
- **🐛 Bug Reports**: Open an issue if you find any problems
- **💡 Feature Requests**: Suggest new features via issues
- **🔧 Pull Requests**: Submit code improvements

### Adding a New Language

1. Open `src/i18n.js`
2. Copy any existing language block (e.g., the `'en'` block)
3. Add a new key (e.g., `'th'` for Thai) and translate all strings
4. The language will automatically appear in the dropdown selector

---

## 📜 Changelog

### v1.0.0
- 🎉 Initial public release
- 📝 Full skill CRUD (Create, Read, Update, Delete)
- 📦 Import skills from files and folders
- 🌍 16 language support with auto-detection
- 🎨 Native VS Code / Antigravity theme integration
- 💾 Ctrl/Cmd+S quick save support
- 🔒 Confirmation dialogs for destructive actions

---

## 📄 License

This project is licensed under the [MIT License](https://github.com/Michael-IT001/antigravity-skills-editor/blob/HEAD/LICENSE).

---

> **Made with ❤️ for the Antigravity community**
