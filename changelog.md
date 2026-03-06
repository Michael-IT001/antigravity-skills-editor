# Changelog

All notable changes to the **Ultra Skills Editor** will be documented in this file.


## [2.0.0] - 2026-03-07
### 🚀 Major Release — Complete Redesign
- 🔍 **Search & Filter**: Real-time fuzzy search in sidebar with type filter tabs (All / Global / Project)
- 📝 **Markdown Preview**: Toggle between Edit and Preview modes with full Markdown rendering (headings, lists, code blocks, checkboxes, blockquotes, frontmatter)
- 📋 **Skill Templates**: 6 built-in templates when creating new skills (Blank, Code Reviewer, Test Writer, API Designer, Documentation Writer, Debugger)
- 📤 **Export**: Export individual skills as `.md` files via toolbar button or context menu
- 📊 **Statistics Bar**: Word count, line count, and last modified time displayed below the editor toolbar
- ⌨️ **Keyboard Shortcuts**: `Cmd/Ctrl+F` (search), `Cmd/Ctrl+N` (new skill), `↑/↓` (navigate list), `Tab` (indent in editor)
- 🔄 **Duplicate Skill**: Right-click context menu option to duplicate any skill
- 🎨 **Visual Upgrades**: Description preview in sidebar, unsaved changes indicator (yellow dot), smoother animations, refined spacing
- 📊 **Skill Count**: Total skills count displayed in sidebar footer
- 🏗️ **Architecture**: Reduced SkillsPanel.js from 1625 lines to 956 lines while adding significant new features
- 🚀 **Ultimate IDE Compatibility**: Full native support and intelligent path resolution for **Trae (Global & CN)**, **Cursor**, and **Antigravity**. Global and project-level skills will now automatically bind to your specific editor's native workspace environment without conflicts!

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
