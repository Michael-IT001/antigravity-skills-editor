# 🚀 Release Notes: Antigravity Skills Editor v1.0.18

This version focuses on UI/UX excellence, security, and a premium multi-language experience. Ready for public release!

## 🌟 What's New

### 🛒 The New "@" Icon Cart System
Selection is now faster and more intuitive.
- **Direct Icon Selection**: Click the `@` icon next to any skill to add it to your clipboard cart instantly. No need to switch between editors.
- **Shift + Click Multi-Select**: Professional-grade range selection. Hold Shift while clicking icons to select or deselect groups of skills in one go.

### 📱 Intelligent Responsive Layout
We've completely re-engineered the panel to feel like a high-end desktop application on any screen size.
- **Adaptive Toolbars**: Button text automatically transforms into centered icons in narrow windows, preventing overlapping or layout breaks.
- **Smart Folding Header**: The skill path detail automatically hides when space is limited, ensuring the skill title remains clearly visible.
- **Premium Styling**: Refined spacing, high-contrast states, and optimized monospace editor padding for a superior writing experience.

### 🌍 Global Localization Pro
- **16 Languages**: Fully localized across 16 major languages (English, Chinese, Japanese, Korean, Spanish, French, German, Italian, etc.).
- **Automatic Detection**: Now reliably detects your editor's primary language on launch.
- **Selection Localization**: All informational messages and selection badges are now contextually translated.

---

## 🔒 Security & Privacy Check
- **No Path Leaks**: All absolute platform-specific paths (e.g., `/Users/...`) have been verified as dynamic and never hardcoded.
- **No Local Data Tracked**: `.gitignore` has been hardened to exclude all development logs, local environment files (`.env`), and build artifacts from the repository.
- **Developer Cleanliness**: Removed all debug `console.log` statements from the extension core for a silent, professional background process.

---

## 🛠️ How to Post to GitHub / Stores

1. **GitHub**:
   - Push the updated `README.md` and `CHANGELOG.md`.
   - Create a new Tag/Release named `v1.0.18`.
   - Upload the `antigravity-skills-editor-1.0.18.vsix` as a release artifact.
   - Use the text above for the Release description.

2. **Marketplace (App Store)**:
   - Use the `README.md` content for the extension description.
   - The publisher is currently set to `Michael-IT001` in `package.json`. Make sure your marketplace account matches this or update it accordingly.

---
**Made with ❤️ for the AI community.**
