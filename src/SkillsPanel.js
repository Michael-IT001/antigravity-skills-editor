const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const os = require('os');
const translations = require('./i18n');

class SkillsPanel {
    static currentPanel = undefined;
    static viewType = 'skillsEditor';

    static createOrShow(context) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (SkillsPanel.currentPanel) {
            SkillsPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            SkillsPanel.viewType,
            'Skills Editor',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        SkillsPanel.currentPanel = new SkillsPanel(panel, context);
    }

    constructor(panel, context) {
        this._panel = panel;
        this._context = context;
        this._disposables = [];

        // Resolve language
        this._lang = this._resolveLang();
        this._i18n = translations[this._lang] || translations['en'];

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'requestSkills':
                        this._panel.webview.postMessage({ command: 'loadSkills', skills: this._getSkills() });
                        return;
                    case 'saveSkill':
                        this._saveSkill(message.skillPath, message.content);
                        return;
                    case 'deleteSkill':
                        this._deleteSkill(message.skillPath);
                        return;
                    case 'importSkills':
                        this._importSkills();
                        return;
                    case 'createSkill':
                        this._createSkill(message.skillName, message.isGlobal);
                        return;
                    case 'changeLang':
                        this._changeLang(message.lang);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    _resolveLang() {
        let lang = this._context.globalState.get('antigravitySkillsLang');
        if (lang && translations[lang]) return lang;
        // Auto-detect from VS Code locale
        const vsLang = (vscode.env.language || 'en').toLowerCase();
        if (translations[vsLang]) return vsLang;
        const base = vsLang.split('-')[0];
        if (translations[base]) return base;
        // Special mapping
        const map = { 'zh-cn': 'zh-cn', 'zh-tw': 'zh-tw', 'zh-hant': 'zh-tw', 'zh-hans': 'zh-cn', 'pt-br': 'pt-br', 'pt': 'pt-br' };
        if (map[vsLang]) return map[vsLang];
        return 'en';
    }

    _changeLang(lang) {
        if (!translations[lang]) return;
        this._lang = lang;
        this._i18n = translations[lang];
        this._context.globalState.update('antigravitySkillsLang', lang);
        // Rebuild the whole webview with new language
        this._update();
    }

    dispose() {
        SkillsPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables && this._disposables.length) {
            const x = this._disposables.pop();
            if (x) x.dispose();
        }
    }

    _getWorkspacePath() {
        return vscode.workspace.workspaceFolders
            ? vscode.workspace.workspaceFolders[0].uri.fsPath
            : undefined;
    }

    _getSkillDirectories() {
        const dirs = [];
        // Global skills
        dirs.push({
            path: path.join(os.homedir(), '.antigravity', 'skills'),
            type: 'Global'
        });
        // Project skills
        const wsPath = this._getWorkspacePath();
        if (wsPath) {
            const projectDirs = ['cursor_skills', '.agents/workflows', '.cursor/skills', '.agents'];
            let found = null;
            for (const dir of projectDirs) {
                const fullPath = path.join(wsPath, dir);
                if (fs.existsSync(fullPath)) { found = fullPath; break; }
            }
            dirs.push({ path: found || path.join(wsPath, 'cursor_skills'), type: 'Project' });
        }
        return dirs;
    }

    async _update() {
        this._panel.title = this._i18n.title;
        this._panel.webview.html = this._getHtmlForWebview();
    }

    _getSkills() {
        const skillDirs = this._getSkillDirectories();
        const skills = [];
        for (const { path: dirPath, type } of skillDirs) {
            if (!fs.existsSync(dirPath)) continue;
            try {
                const entries = fs.readdirSync(dirPath, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory() && !entry.name.startsWith('.')) {
                        const skillMdPath = path.join(dirPath, entry.name, 'SKILL.md');
                        let content = '';
                        if (fs.existsSync(skillMdPath)) {
                            content = fs.readFileSync(skillMdPath, 'utf8');
                        }
                        skills.push({ name: entry.name, path: skillMdPath, content, type });
                    }
                }
            } catch (e) {
                console.error('Failed to read skills directory:', e);
            }
        }
        skills.sort((a, b) => a.name.localeCompare(b.name));
        return skills;
    }

    _saveSkill(skillPath, content) {
        try {
            const dir = path.dirname(skillPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(skillPath, content, 'utf8');
            this._panel.webview.postMessage({ command: 'loadSkills', skills: this._getSkills() });
        } catch (err) {
            vscode.window.showErrorMessage(this._i18n.saveFailed + ' ' + err.message);
        }
    }

    _deleteSkill(skillPath) {
        try {
            const dir = path.dirname(skillPath);
            if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
            this._panel.webview.postMessage({ command: 'loadSkills', skills: this._getSkills() });
        } catch (err) {
            vscode.window.showErrorMessage(this._i18n.deleteFailed + ' ' + err.message);
        }
    }

    async _importSkills() {
        const t = this._i18n;
        const uris = await vscode.window.showOpenDialog({
            canSelectFiles: true, canSelectFolders: true, canSelectMany: true,
            openLabel: t.importBtn,
            filters: { 'Markdown': ['md', '*'] }
        });
        if (!uris || uris.length === 0) return;

        const target = await vscode.window.showQuickPick([
            { label: '$(globe) ' + t.importGlobal, target: 'global' },
            { label: '$(folder) ' + t.importProject, target: 'project' }
        ], { placeHolder: t.importPickerTitle });
        if (!target) return;

        let targetDir = null;
        if (target.target === 'global') {
            targetDir = path.join(os.homedir(), '.antigravity', 'skills');
        } else {
            const wsPath = this._getWorkspacePath();
            if (!wsPath) { vscode.window.showErrorMessage(t.wsError); return; }
            targetDir = path.join(wsPath, 'cursor_skills');
        }

        try {
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            let count = 0;
            for (const fileUri of uris) {
                const stat = fs.statSync(fileUri.fsPath);
                if (stat.isDirectory()) {
                    const dest = path.join(targetDir, path.basename(fileUri.fsPath));
                    if (fs.cpSync) fs.cpSync(fileUri.fsPath, dest, { recursive: true });
                    count++;
                } else if (fileUri.fsPath.endsWith('.md')) {
                    let skillName = path.basename(fileUri.fsPath, '.md');
                    if (['SKILL', 'README'].includes(skillName.toUpperCase())) {
                        skillName = path.basename(path.dirname(fileUri.fsPath));
                    }
                    if (!skillName) skillName = 'Skill_' + Date.now();
                    const destDir = path.join(targetDir, skillName);
                    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
                    fs.copyFileSync(fileUri.fsPath, path.join(destDir, 'SKILL.md'));
                    count++;
                }
            }
            vscode.window.showInformationMessage(t.importSuccess + ` (${count})`);
            this._panel.webview.postMessage({ command: 'loadSkills', skills: this._getSkills() });
        } catch (err) {
            vscode.window.showErrorMessage(t.importFailed + ' ' + err.message);
        }
    }

    _createSkill(skillName, isGlobal = true) {
        if (!skillName) return;
        const t = this._i18n;
        let targetDir = null;
        if (isGlobal) {
            targetDir = path.join(os.homedir(), '.antigravity', 'skills');
        } else {
            const wsPath = this._getWorkspacePath();
            if (!wsPath) { vscode.window.showErrorMessage(t.wsError); return; }
            targetDir = path.join(wsPath, 'cursor_skills');
        }
        try {
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            const newSkillDir = path.join(targetDir, skillName);
            if (!fs.existsSync(newSkillDir)) fs.mkdirSync(newSkillDir);
            const skillMdPath = path.join(newSkillDir, 'SKILL.md');
            if (!fs.existsSync(skillMdPath)) {
                fs.writeFileSync(skillMdPath, `---\ndescription: ${skillName}\n---\n\nAdd your instructions here.`, 'utf8');
            }
            this._panel.webview.postMessage({ command: 'loadSkills', skills: this._getSkills() });
        } catch (err) {
            vscode.window.showErrorMessage(t.createFailed + ' ' + err.message);
        }
    }

    _getHtmlForWebview() {
        const t = this._i18n;
        const currentLang = this._lang;

        // Build language options for the selector
        const langOptions = Object.entries(translations).map(([code, tr]) =>
            `<option value="${code}" ${code === currentLang ? 'selected' : ''}>${tr.name}</option>`
        ).join('');

        // Serialize translations for webview JS
        const tJson = JSON.stringify(t).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

        return /* html */`
            <!DOCTYPE html>
            <html lang="${currentLang}">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${t.title}</title>
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
                <style>
                    :root {
                        --sidebar-width: 260px;
                        --header-height: 48px;
                        --transition-speed: 0.15s;
                    }

                    body {
                        font-family: var(--vscode-font-family);
                        padding: 0;
                        margin: 0;
                        color: var(--vscode-editor-foreground);
                        background-color: var(--vscode-editor-background);
                        display: flex;
                        height: 100vh;
                        overflow: hidden;
                    }

                    .sidebar {
                        width: var(--sidebar-width);
                        min-width: var(--sidebar-width);
                        background-color: var(--vscode-sideBar-background);
                        border-right: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
                        display: flex;
                        flex-direction: column;
                        z-index: 10;
                    }

                    .sidebar-header {
                        height: var(--header-height);
                        padding: 0 16px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
                    }

                    .sidebar-title {
                        font-weight: 700;
                        font-size: 16px;
                        color: var(--vscode-sideBarTitle-foreground);
                        text-shadow: 0 1px 2px rgba(0,0,0,0.1);
                        letter-spacing: 0.2px;
                    }

                    .header-actions {
                        display: flex;
                        gap: 4px;
                        align-items: center;
                    }

                    .add-btn {
                        background: transparent;
                        border: none;
                        color: var(--vscode-icon-foreground);
                        cursor: pointer;
                        padding: 4px;
                        border-radius: 4px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: background-color var(--transition-speed);
                    }

                    .add-btn:hover {
                        background-color: var(--vscode-toolbar-hoverBackground);
                        color: var(--vscode-toolbar-hoverOutline, var(--vscode-icon-foreground));
                    }

                    .skill-list {
                        flex: 1;
                        overflow-y: auto;
                        padding: 8px 0;
                    }

                    .skill-item {
                        padding: 6px 16px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        font-size: 13px;
                        color: var(--vscode-sideBar-foreground);
                        transition: background-color var(--transition-speed), color var(--transition-speed);
                    }

                    .skill-item:hover {
                        background-color: var(--vscode-list-hoverBackground);
                        color: var(--vscode-list-hoverForeground, var(--vscode-sideBar-foreground));
                    }

                    .skill-item.active {
                        background-color: var(--vscode-list-activeSelectionBackground);
                        color: var(--vscode-list-activeSelectionForeground);
                        position: relative;
                    }

                    .main-area {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        background-color: var(--vscode-editor-background);
                    }

                    .editor-header {
                        height: var(--header-height);
                        padding: 0 24px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
                        background-color: var(--vscode-editorGroupHeader-tabsBackground, var(--vscode-editor-background));
                    }

                    .skill-title-container {
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                    }

                    .skill-title {
                        font-size: 14px;
                        font-weight: 600;
                        color: var(--vscode-editor-foreground);
                    }

                    .skill-path {
                        font-size: 11px;
                        color: var(--vscode-descriptionForeground);
                        margin-top: 2px;
                    }

                    .save-btn {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 6px 14px;
                        font-size: 12px;
                        border-radius: 2px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: background-color var(--transition-speed);
                    }

                    .save-btn:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }

                    .editor-container {
                        flex: 1;
                        position: relative;
                        display: flex;
                        flex-direction: column;
                    }

                    textarea {
                        flex: 1;
                        width: 100%;
                        height: 100%;
                        box-sizing: border-box;
                        background-color: transparent;
                        color: var(--vscode-editor-foreground);
                        border: none;
                        padding: 24px;
                        font-family: var(--vscode-editor-font-family, 'Menlo', 'Monaco', 'Courier New', monospace);
                        font-size: var(--vscode-editor-font-size, 13px);
                        line-height: 1.6;
                        resize: none;
                        outline: none;
                        white-space: pre;
                        overflow-wrap: normal;
                        overflow-x: auto;
                    }

                    textarea::selection {
                        background-color: var(--vscode-editor-selectionBackground);
                    }

                    .empty-state {
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        height: 100%;
                        color: var(--vscode-descriptionForeground);
                        font-size: 14px;
                    }

                    .empty-state svg {
                        width: 48px;
                        height: 48px;
                        margin-bottom: 16px;
                        opacity: 0.5;
                    }

                    .modal-overlay {
                        position: fixed;
                        top: 0; left: 0; right: 0; bottom: 0;
                        background-color: rgba(0, 0, 0, 0.5);
                        display: none;
                        justify-content: center;
                        align-items: center;
                        z-index: 100;
                    }

                    .modal-overlay.active {
                        display: flex;
                    }

                    .modal {
                        background-color: var(--vscode-editorWidget-background);
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 6px;
                        padding: 24px;
                        width: 400px;
                        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                    }

                    .modal h3 {
                        margin: 0;
                        font-size: 16px;
                        font-weight: 600;
                        color: var(--vscode-editor-foreground);
                    }

                    .modal input[type="text"] {
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        padding: 8px 12px;
                        font-size: 13px;
                        border-radius: 2px;
                        outline: none;
                        font-family: inherit;
                    }

                    .modal input[type="text"]:focus {
                        border-color: var(--vscode-focusBorder);
                    }

                    .modal-actions {
                        display: flex;
                        justify-content: flex-end;
                        gap: 8px;
                        margin-top: 8px;
                    }

                    .modal-btn {
                        padding: 6px 14px;
                        font-size: 12px;
                        border-radius: 2px;
                        cursor: pointer;
                        border: none;
                        font-weight: 500;
                    }

                    .modal-btn.secondary {
                        background-color: var(--vscode-button-secondaryBackground, transparent);
                        color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
                    }

                    .modal-btn.secondary:hover {
                        background-color: var(--vscode-button-secondaryHoverBackground, rgba(255,255,255,0.1));
                    }

                    .modal-btn.primary {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                    }

                    .modal-btn.primary:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }

                    .icon {
                        width: 16px;
                        height: 16px;
                        fill: currentColor;
                    }

                    /* Language Selector */
                    .sidebar-footer {
                        padding: 8px 12px;
                        border-top: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }

                    .lang-select {
                        flex: 1;
                        background-color: var(--vscode-dropdown-background, var(--vscode-input-background));
                        color: var(--vscode-dropdown-foreground, var(--vscode-input-foreground));
                        border: 1px solid var(--vscode-dropdown-border, var(--vscode-input-border));
                        padding: 4px 6px;
                        font-size: 12px;
                        border-radius: 2px;
                        outline: none;
                        cursor: pointer;
                        font-family: inherit;
                    }

                    .lang-select:focus {
                        border-color: var(--vscode-focusBorder);
                    }

                    .lang-icon {
                        width: 14px;
                        height: 14px;
                        fill: var(--vscode-descriptionForeground);
                        opacity: 0.7;
                        flex-shrink: 0;
                    }
                </style>
            </head>
            <body>
                <div class="sidebar">
                    <div class="sidebar-header">
                        <div class="sidebar-title">${t.title}</div>
                        <div class="header-actions">
                            <button class="add-btn" id="importBtn" title="${t.importBtn}">
                                <svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M11.5 1h-7l-.5.5V5H1.5l-.5.5v9l.5.5h13l.5-.5v-9l-.5-.5H12V1.5l-.5-.5zM5 2h6v3H5V2zm9 12H2V6h12v8z"/>
                                    <path d="M5 8h6v1H5z"/>
                                </svg>
                            </button>
                            <button class="add-btn" id="newSkillBtn" title="${t.create}">
                                <svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14 7v1H8v6H7V8H1V7h6V1h1v6h6z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="skill-list" id="skillList"></div>
                    <div class="sidebar-footer">
                        <svg class="lang-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1c.53 0 1.09.3 1.6.95.37.47.68 1.09.91 1.81a12.7 12.7 0 0 1-5.02 0c.23-.72.54-1.34.91-1.81C6.91 2.3 7.47 2 8 2zm-3.34.72A6 6 0 0 0 2.27 6h2.06c.13-1.17.4-2.23.78-3.08a3.8 3.8 0 0 0-.45-.2zM11.34 2.72c-.14.06-.3.12-.45.2.38.85.65 1.91.78 3.08h2.06a6 6 0 0 0-2.39-3.28zM2.27 7h2.06c.04.33.07.66.07 1s-.03.67-.07 1H2.27a5.9 5.9 0 0 1 0-2zm3.07 0h5.32c.04.33.07.66.07 1s-.03.67-.07 1H5.34c-.04-.33-.07-.66-.07-1s.03-.67.07-1zm6.33 0h2.06a5.9 5.9 0 0 1 0 2h-2.06c.04-.33.07-.66.07-1s-.03-.67-.07-1zM2.27 10h2.06c.13 1.17.4 2.23.78 3.08-.15.07-.3.14-.45.2A6 6 0 0 1 2.27 10zm3.09 0h5.28c-.17.87-.43 1.63-.75 2.24-.51.65-1.07.95-1.6.95s-1.09-.3-1.6-.95c-.32-.61-.58-1.37-.75-2.24h-.58zm6.31 0h2.06a6 6 0 0 1-2.39 3.28c-.14-.06-.3-.12-.45-.2.38-.85.65-1.91.78-3.08z"/>
                        </svg>
                        <select class="lang-select" id="langSelect">${langOptions}</select>
                    </div>
                </div>

                <div class="main-area" id="mainArea">
                    <div class="empty-state">
                        <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                            <path d="M13.5 2h-12l-.5.5v11l.5.5h12l.5-.5v-11l-.5-.5zM2 3h11v1H2V3zm7 4H2V6h7v1zm0 2H2V8h7v1zm-3 2H2v-1h4v1zm7 0h-2v-1h2v1zm0-2h-2V8h2v1zm0-2h-2V6h2v1z"/>
                        </svg>
                        <div>${t.empty}</div>
                    </div>
                </div>

                <div class="modal-overlay" id="createModal">
                    <div class="modal">
                        <h3>${t.create}</h3>
                        <input type="text" id="newSkillInput" placeholder="${t.placeholder}" autocomplete="off">
                        <div style="display:flex; gap:16px; margin-top:-4px;">
                            <label style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--vscode-foreground); cursor:pointer;">
                                <input type="radio" name="skillType" value="global" checked> ${t.importGlobal}
                            </label>
                            <label style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--vscode-foreground); cursor:pointer;">
                                <input type="radio" name="skillType" value="project"> ${t.importProject}
                            </label>
                        </div>
                        <div class="modal-actions">
                            <button class="modal-btn secondary" id="cancelCreateBtn">${t.cancel}</button>
                            <button class="modal-btn primary" id="confirmCreateBtn">${t.confirmCreate}</button>
                        </div>
                    </div>
                </div>

                <div class="modal-overlay" id="confirmModal">
                    <div class="modal">
                        <h3 id="confirmTitle">${t.confirmAction}</h3>
                        <div id="confirmMessage" style="font-size: 13px; color: var(--vscode-descriptionForeground);"></div>
                        <div class="modal-actions">
                            <button class="modal-btn secondary" id="cancelConfirmBtn">${t.cancel}</button>
                            <button class="modal-btn primary" id="acceptConfirmBtn">${t.confirmAction}</button>
                        </div>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const t = ${tJson};
                    let skills = [];
                    let currentIndex = -1;

                    const skillList = document.getElementById('skillList');
                    const mainArea = document.getElementById('mainArea');
                    const newSkillBtn = document.getElementById('newSkillBtn');
                    const createModal = document.getElementById('createModal');
                    const newSkillInput = document.getElementById('newSkillInput');
                    const cancelCreateBtn = document.getElementById('cancelCreateBtn');
                    const confirmCreateBtn = document.getElementById('confirmCreateBtn');

                    // Language selector
                    document.getElementById('langSelect').addEventListener('change', (e) => {
                        vscode.postMessage({ command: 'changeLang', lang: e.target.value });
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'loadSkills') {
                            skills = message.skills || [];
                            renderList();
                            if (skills.length > 0) {
                                if (currentIndex >= skills.length) currentIndex = skills.length - 1;
                                if (currentIndex === -1) currentIndex = 0;
                                renderEditor(currentIndex);
                            } else {
                                currentIndex = -1;
                                mainArea.innerHTML = \`
                                    <div class="empty-state">
                                        <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                                            <path d="M13.5 2h-12l-.5.5v11l.5.5h12l.5-.5v-11l-.5-.5zM2 3h11v1H2V3zm7 4H2V6h7v1zm0 2H2V8h7v1zm-3 2H2v-1h4v1zm7 0h-2v-1h2v1zm0-2h-2V8h2v1zm0-2h-2V6h2v1z"/>
                                        </svg>
                                        <div>\${t.noSkills}</div>
                                    </div>
                                \`;
                            }
                        }
                    });

                    function renderList() {
                        skillList.innerHTML = skills.map((skill, index) => \`
                            <div class="skill-item \${index === currentIndex ? 'active' : ''}" data-index="\${index}">
                                <svg class="icon" style="margin-right:8px; opacity:0.8" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M13.5 2h-12l-.5.5v11l.5.5h12l.5-.5v-11l-.5-.5zM2 3h11v1H2V3zm11 10H2V5h11v8z"/>
                                    <path d="M4 6h7v1H4V6zm0 2h7v1H4V8zm0 2h5v1H4v-1z"/>
                                </svg>
                                <span style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden; flex: 1;">\${skill.name}</span>
                                \${skill.type === 'Global' ? '<span style="font-size: 9px; padding: 2px 4px; border-radius: 3px; background: rgba(128,128,128,0.2); margin-left: auto;">' + t.globalBadge + '</span>' : ''}
                            </div>
                        \`).join('');
                    }

                    function renderEditor(index) {
                        currentIndex = index;
                        renderList();

                        const skill = skills[index];
                        if (!skill) return;

                        mainArea.innerHTML = \`
                            <div class="editor-header">
                                <div class="skill-title-container">
                                    <div class="skill-title">\${skill.name}</div>
                                    <div class="skill-path">\${skill.path}</div>
                                </div>
                                <div style="display:flex; gap:8px;">
                                    <button class="save-btn" id="deleteBtn" style="background-color:var(--vscode-errorForeground); color:var(--vscode-button-foreground); width:32px; padding:6px; display:flex; align-items:center; justify-content:center;" title="\${t.deleteConfirmTitle}">
                                        <svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M14 3h-3V1H5v2H2v1h1v11h10V4h1V3zM6 2h4v1H6V2zm6 12H4V4h8v10z"/><path d="M6 6h1v6H6zm3 0h1v6H9z"/></svg>
                                    </button>
                                    <button class="save-btn" id="saveBtn">\${t.saveBtn}</button>
                                </div>
                            </div>
                            <div class="editor-container">
                                <textarea id="skillContent" spellcheck="false"></textarea>
                            </div>
                        \`;

                        document.getElementById('skillContent').value = skill.content;

                        document.getElementById('deleteBtn').addEventListener('click', () => {
                            showConfirm(t.deleteConfirmTitle, t.deleteMsg, () => {
                                vscode.postMessage({ command: 'deleteSkill', skillPath: skill.path });
                            }, true);
                        });

                        document.getElementById('saveBtn').addEventListener('click', () => {
                            showConfirm(t.saveConfirmTitle, t.saveMsg, () => {
                                const btn = document.getElementById('saveBtn');
                                const orig = btn.innerText;
                                btn.innerText = t.saving;
                                const content = document.getElementById('skillContent').value;
                                vscode.postMessage({ command: 'saveSkill', skillPath: skill.path, content });
                                setTimeout(() => btn.innerText = orig, 500);
                            });
                        });

                        const textarea = document.getElementById('skillContent');
                        textarea.addEventListener('keydown', (e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                                e.preventDefault();
                                document.getElementById('saveBtn').click();
                            }
                        });
                    }

                    document.getElementById('importBtn').addEventListener('click', () => {
                        vscode.postMessage({ command: 'importSkills' });
                    });

                    const confirmModal = document.getElementById('confirmModal');
                    const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
                    const acceptConfirmBtn = document.getElementById('acceptConfirmBtn');
                    const confirmTitleEl = document.getElementById('confirmTitle');
                    const confirmMessageEl = document.getElementById('confirmMessage');
                    let confirmCallback = null;

                    function showConfirm(title, message, callback, isDestructive = false) {
                        confirmTitleEl.innerText = title;
                        confirmMessageEl.innerText = message;
                        confirmCallback = callback;
                        acceptConfirmBtn.style.backgroundColor = isDestructive ? 'var(--vscode-errorForeground)' : 'var(--vscode-button-background)';
                        confirmModal.classList.add('active');
                    }

                    function closeConfirmModal() {
                        confirmModal.classList.remove('active');
                        confirmCallback = null;
                        acceptConfirmBtn.style.backgroundColor = '';
                    }

                    cancelConfirmBtn.addEventListener('click', closeConfirmModal);
                    acceptConfirmBtn.addEventListener('click', () => {
                        if (confirmCallback) confirmCallback();
                        closeConfirmModal();
                    });
                    confirmModal.addEventListener('click', (e) => {
                        if (e.target === confirmModal) closeConfirmModal();
                    });

                    skillList.addEventListener('click', (e) => {
                        const target = e.target.closest('.skill-item');
                        if (target) {
                            const index = parseInt(target.getAttribute('data-index'));
                            renderEditor(index);
                        }
                    });

                    newSkillBtn.addEventListener('click', () => {
                        createModal.classList.add('active');
                        newSkillInput.value = '';
                        setTimeout(() => newSkillInput.focus(), 100);
                    });

                    function closeCreateModal() {
                        createModal.classList.remove('active');
                    }

                    cancelCreateBtn.addEventListener('click', closeCreateModal);
                    createModal.addEventListener('click', (e) => {
                        if (e.target === createModal) closeCreateModal();
                    });

                    function createSkill() {
                        const val = newSkillInput.value.trim();
                        const typeRadios = document.getElementsByName('skillType');
                        let isGlobal = true;
                        if (typeRadios) {
                            for (const radio of typeRadios) {
                                if (radio.checked && radio.value === 'project') isGlobal = false;
                            }
                        }
                        if (val) {
                            vscode.postMessage({ command: 'createSkill', skillName: val, isGlobal });
                            closeCreateModal();
                        }
                    }

                    confirmCreateBtn.addEventListener('click', createSkill);
                    newSkillInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') { e.preventDefault(); createSkill(); }
                        else if (e.key === 'Escape') closeCreateModal();
                    });

                    // Request skills on load
                    vscode.postMessage({ command: 'requestSkills' });
                </script>
            </body>
            </html>
        `;
    }
}

module.exports = SkillsPanel;
