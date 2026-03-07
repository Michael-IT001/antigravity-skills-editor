# Changelog

All notable changes to the **Ultra Skills Editor** will be documented in this file.

## [2.1.2] - 2026-03-07
### 📝 Documentation Fix
- 📝 **Intro Text Update**: Added `Trae CN` explicitly to the bolded introduction list in the `README.md` to perfectly match the 8 supported platforms.

## [2.1.1] - 2026-03-07
### 🌐 Precision Environment Routing
- 🚀 **8 IDEs Supported**: Explicitly separated **Trae** (`.trae`) and **Trae CN** (`.trae-cn`) into completely independent storage and project workspaces to ensure absolute isolation for users operating both clients simultaneously. Total officially supported IDEs is now **8**.

## [2.1.0] - 2026-03-07
### 🌐 Universal IDE Expansion
- 🚀 **7 IDEs Supported**: Added native path resolution and intelligent workspace routing for **VSCode**, **Qoder**, **Windsurf**, and **CodeBuddy**, bringing the total officially supported IDEs to **7** (alongside Cursor, Trae, and Antigravity). All paths are automatically insulated!

## [2.0.1] - 2026-03-07
### 📝 Documentation & Integrity Update
- 🧹 **Removed Inaccurate Claims**: Removed unofficial features from previous documentation to ensure the feature list is 100% truthful to the source code.

## [2.0.0] - 2026-03-07
### 🚀 Major Release — Enhanced Workflow & Compatibility
- 🔍 **Search & Filter**: Real-time fuzzy search in sidebar with type filter tabs (All / Global / Project)
- 🖱️ **Context Menu**: Right-click any skill in the sidebar to quickly Rename or Delete it
- ⌨️ **Keyboard Shortcuts**: `Cmd/Ctrl+F` (focus search), `Cmd/Ctrl+N` (new skill), `↑/↓` (navigate list), and `Tab` (indent in editor)
- 📤 **Export**: Export individual skills as `.md` files via the new toolbar button
- 🎨 **UI Enhancements**: Added description previews in the sidebar and a total skills count in the footer
- 🏗️ **Architecture**: Reduced SkillsPanel.js from 1625 lines to 956 lines while adding significant new features
- 🚀 **Initial IDE Compatibility**: Full native support and path resolution for **Trae (Global & CN)**, **Cursor**, and **Antigravity**. Global and project-level skills will now automatically bind to your specific editor's native workspace environment!

## [1.8.7] - 2026-03-07
- 📝 **Pro Tip**: Explicitly added `Shift + Drag` instructions to the main introduction and "How to Open" sections in the documentation so that it's physically impossible for users to miss it! 😆

## [1.8.6] - 2026-03-07
- 📝 **Documentation**: Added clear instructions for the **Shift + Drag-and-Drop** import method in `README.md`.
- 💡 **Help Tip**: Clarified that holding Shift is necessary to prevent Cursor/Antigravity from intercepting the drop as a regular file open.

## [1.8.5] - 2026-03-06
- 📝 **Documentation Layout**: Moved the `How to Open the Editor` section to the very top of `README.md` (before Highlights) so that users immediately know where to click after installation.

## [1.8.4] - 2026-03-06
- 📝 **Documentation**: Clearly outlined how new users can locate and open the Skills Editor panel (via the Status Bar, Command Palette, or Right-Click menu) in `README.md`.

## [1.8.3] - 2026-03-06
- 🐛 **Bug Fix**: Fixed a visual issue where the VS Code/Cursor status bar item text wouldn't instantly update when switching languages inside the extension UI.

## [1.8.2] - 2026-03-05
- 🎉 **Rebranded to Ultra Skills Editor**: Renamed to better reflect its universal support for both Antigravity and Cursor IDEs!
- 🚀 **Dual IDE Support**: Intelligent environment detection natively routes to `~/.cursor/skills` (Cursor) or `~/.antigravity/skills` (Antigravity).
- ✨ **Context Menu Magic**: Right-clicking any skill in the sidebar now opens a custom Context Menu.
- ✏️ **Skill Renaming**: The new Context Menu allows you to quickly rename skills directly from the IDE UI without opening the file explorer.
- 🐛 **Bug Fix**: Fixed a critical bug where the UI would get stuck on "Loading..." due to unescaped unicode characters in Webview injections.


## [1.1.0] - 2026-02-27
- ✨ **Drag-and-Drop Reordering**: Introduced a new feature to manually reorder skills by dragging and dropping items in the sidebar.
- 💾 **Persistent Order**: Custom skill order is now saved and persisted across sessions.
- ↔️ **Resizable Sidebar**: Added a resizer to the sidebar, allowing users to customize the width of the skills list.
- 🧹 **Code Cleaning**: Removed internal metadata and prepared the package for public release.

## [1.0.0] - 2026-02-22
### Added
- 🎉 Initial public release
- 📝 Full skill CRUD (Create, Read, Update, Delete)
- 📦 Import skills from `.md` files and skill directories
- 🌍 16 language support with automatic detection and manual switching
- 🎨 Native Cursor / Antigravity theme integration
- 💾 `Ctrl/Cmd + S` quick save shortcut
- 🔒 Confirmation dialogs for save and delete operations
- 🗂️ Global and project-scoped skill storage
- 🌐 Persistent language preference across sessions
