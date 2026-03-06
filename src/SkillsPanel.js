const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const os = require('os');
const translations = require('./i18n');

function createSkillContent(name, desc, body) {
    const n = name || '';
    const d = desc || n;
    const b = body || '';
    return `---\nname: ${n}\ndescription: ${d}\n---\n\n${b}`;
}

class SkillsPanel {
    static currentPanel = undefined;
    static viewType = 'skillsEditor';

    static createOrShow(context) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
        if (SkillsPanel.currentPanel) { SkillsPanel.currentPanel._panel.reveal(column); return; }
        const panel = vscode.window.createWebviewPanel(SkillsPanel.viewType, 'Skills Editor', column || vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
        SkillsPanel.currentPanel = new SkillsPanel(panel, context);
    }

    constructor(panel, context) {
        this._panel = panel;
        this._context = context;
        this._disposables = [];
        this._lang = this._resolveLang();
        this._i18n = translations[this._lang] || translations['en'];
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'requestSkills': this._panel.webview.postMessage({ command: 'loadSkills', skills: this._getSkills() }); return;
                case 'saveSkill': this._saveSkill(message.skillPath, message.content); return;
                case 'deleteSkill': this._deleteSkill(message.skillPath); return;
                case 'renameSkill': this._renameSkill(message.skillPath, message.newName); return;
                case 'importSkills': this._importSkills(); return;
                case 'dropFilesContent': this._handleDroppedContent(message); return;
                case 'createSkill': this._createSkill(message.skillName, message.isGlobal, message.description, message.body); return;
                case 'writeToClipboardExact': this._writeToClipboardExact(message.payload, message.count); return;
                case 'changeLang': this._changeLang(message.lang); return;
                case 'saveOrder': this._saveOrder(message.order); return;
                case 'exportSkill': this._exportSkill(message.skillPath); return;
                case 'duplicateSkill': this._duplicateSkill(message.skillPath); return;
                case 'showInfo': vscode.window.showInformationMessage(message.text); return;
                case 'confirmSwitch':
                    vscode.window.showWarningMessage(
                        this._i18n.switchSavePrompt.replace('{0}', message.skillName),
                        { modal: true },
                        { title: this._i18n.saveBtnDialog },
                        { title: this._i18n.dontSaveBtn, isCloseAffordance: true }
                    ).then(choice => {
                        if (choice && choice.title === this._i18n.saveBtnDialog) { this._panel.webview.postMessage({ command: 'switchApproved', save: true }); }
                        else if (choice && choice.title === this._i18n.dontSaveBtn) { this._panel.webview.postMessage({ command: 'switchApproved', save: false }); }
                    });
                    return;
            }
        }, null, this._disposables);
    }

    _resolveLang() {
        let lang = this._context.globalState.get('ultraSkillsLang');
        if (lang && translations[lang]) return lang;
        const vsLang = (vscode.env.language || 'en').toLowerCase();
        if (translations[vsLang]) return vsLang;
        const base = vsLang.split('-')[0];
        if (translations[base]) return base;
        const map = { 'zh-cn': 'zh-cn', 'zh-tw': 'zh-tw', 'zh-hant': 'zh-tw', 'zh-hans': 'zh-cn', 'pt-br': 'pt-br', 'pt': 'pt-br' };
        if (map[vsLang]) return map[vsLang];
        return 'en';
    }

    _detectIDE() {
        const appName = (vscode.env.appName || '').toLowerCase();
        const appRoot = (vscode.env.appRoot || '').toLowerCase();
        let execPath = '';
        try { execPath = (process.execPath || '').toLowerCase(); } catch (e) { }
        const all = appName + ' ' + appRoot + ' ' + execPath;
        if (all.includes('trae-cn') || all.includes('trae_cn') || all.includes('traecn')) return 'trae-cn';
        if (all.includes('trae')) return 'trae';
        if (all.includes('cursor')) return 'cursor';
        return 'antigravity';
    }

    _getIDEPaths() {
        const map = {
            'cursor': { globalDir: '.cursor', projectDir: '.cursor/skills' },
            'trae': { globalDir: '.trae', projectDir: '.trae/skills' },
            'trae-cn': { globalDir: '.trae-cn', projectDir: '.trae-cn/skills' },
            'antigravity': { globalDir: '.antigravity', projectDir: '.agent/skills' }
        };
        return map[this._detectIDE()] || map['antigravity'];
    }

    _changeLang(lang) {
        if (!translations[lang]) return;
        this._lang = lang; this._i18n = translations[lang];
        this._context.globalState.update('ultraSkillsLang', lang);
        if (SkillsPanel.statusBarItem) { SkillsPanel.statusBarItem.text = '$(tools) ' + this._i18n.title; SkillsPanel.statusBarItem.tooltip = this._i18n.create; }
        this._update();
    }

    dispose() {
        SkillsPanel.currentPanel = undefined; this._panel.dispose();
        while (this._disposables && this._disposables.length) { const x = this._disposables.pop(); if (x) x.dispose(); }
    }

    _getWorkspacePath() { return vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined; }

    _getSkillDirectories() {
        const dirs = []; const idePaths = this._getIDEPaths();
        dirs.push({ path: path.join(os.homedir(), idePaths.globalDir, 'skills'), type: 'Global' });
        const wsPath = this._getWorkspacePath();
        if (wsPath) { dirs.push({ path: path.join(wsPath, idePaths.projectDir), type: 'Project' }); }
        return dirs;
    }

    _getEditorPaths() {
        const idePaths = this._getIDEPaths();
        return { global: path.join(os.homedir(), idePaths.globalDir, 'skills'), projectDefault: idePaths.projectDir };
    }

    _getProjectSkillDir(wsPath) {
        if (!wsPath) return null;
        return path.join(wsPath, this._getIDEPaths().projectDir);
    }

    async _update() { this._panel.title = this._i18n.title; this._panel.webview.html = this._getHtmlForWebview(); }

    _getSkills() {
        const skillDirs = this._getSkillDirectories(); const skills = [];
        for (const { path: dirPath, type } of skillDirs) {
            if (!fs.existsSync(dirPath)) continue;
            try {
                const entries = fs.readdirSync(dirPath, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory() && !entry.name.startsWith('.')) {
                        const skillMdPath = path.join(dirPath, entry.name, 'SKILL.md');
                        let content = '', mtime = '';
                        if (fs.existsSync(skillMdPath)) {
                            content = fs.readFileSync(skillMdPath, 'utf8');
                            try { mtime = fs.statSync(skillMdPath).mtime.toISOString(); } catch (e) { }
                        }
                        // Extract name and description from frontmatter
                        let desc = '', displayName = entry.name;
                        const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
                        if (fmMatch) {
                            const nameMatch = fmMatch[1].match(/name:\s*(.+)/);
                            if (nameMatch && nameMatch[1].trim()) displayName = nameMatch[1].trim();
                            const descMatch = fmMatch[1].match(/description:\s*(.+)/);
                            if (descMatch) desc = descMatch[1].trim();
                        }
                        skills.push({ name: entry.name, displayName, path: skillMdPath, content, type, description: desc, mtime });
                    }
                }
            } catch (e) { console.error('Failed to read skills directory:', e); }
        }
        const savedOrder = this._context.globalState.get('ultraSkillsOrder', []);
        if (savedOrder && savedOrder.length > 0) {
            skills.sort((a, b) => { const idxA = savedOrder.indexOf(a.path); const idxB = savedOrder.indexOf(b.path); if (idxA !== -1 && idxB !== -1) return idxA - idxB; if (idxA !== -1) return -1; if (idxB !== -1) return 1; return a.name.localeCompare(b.name); });
        } else { skills.sort((a, b) => a.name.localeCompare(b.name)); }
        return skills;
    }

    _saveOrder(order) { this._context.globalState.update('ultraSkillsOrder', order); }

    _saveSkill(skillPath, content) {
        try {
            const dir = path.dirname(skillPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(skillPath, content, 'utf8');

            // Sync folder name with the newly saved 'name:' field
            const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
            if (fmMatch) {
                const nameMatch = fmMatch[1].match(/name:\s*(.+)/);
                if (nameMatch && nameMatch[1].trim()) {
                    const newName = nameMatch[1].trim();
                    const currentName = path.basename(dir);
                    if (newName !== currentName) {
                        const parentDir = path.dirname(dir);
                        const newDir = path.join(parentDir, newName);
                        // Allow case-only rename on case-insensitive systems like macOS
                        if (!fs.existsSync(newDir) || newDir.toLowerCase() === dir.toLowerCase()) {
                            fs.renameSync(dir, newDir);
                        } else {
                            vscode.window.showErrorMessage(this._i18n.renameFailed + ' A skill with that name already exists.');
                        }
                    }
                }
            }

            this._panel.webview.postMessage({ command: 'loadSkills', skills: this._getSkills() });
        } catch (err) { vscode.window.showErrorMessage(this._i18n.saveFailed + ' ' + err.message); }
    }

    _deleteSkill(skillPath) {
        try {
            const dir = path.dirname(skillPath);
            if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
            this._panel.webview.postMessage({ command: 'loadSkills', skills: this._getSkills() });
        } catch (err) { vscode.window.showErrorMessage(this._i18n.deleteFailed + ' ' + err.message); }
    }

    /** Update name: in frontmatter content string, returns updated content */
    _updateFrontmatterName(content, newName) {
        const fmMatch = content.match(/^(---\s*\n)([\s\S]*?)(\n---)/);
        if (fmMatch) {
            let fm = fmMatch[2];
            if (fm.match(/name:\s*.*/)) {
                fm = fm.replace(/name:\s*.*/, 'name: ' + newName);
            } else {
                fm = 'name: ' + newName + '\n' + fm;
            }
            return fmMatch[1] + fm + fmMatch[3] + content.substring(fmMatch[0].length);
        }
        // No frontmatter found, add one
        return '---\nname: ' + newName + '\ndescription: ' + newName + '\n---\n' + content;
    }

    _renameSkill(skillPath, newName) {
        if (!skillPath || !newName) return;
        try {
            const oldDir = path.dirname(skillPath); const parentDir = path.dirname(oldDir); const newDir = path.join(parentDir, newName);
            if (fs.existsSync(newDir)) { vscode.window.showErrorMessage(this._i18n.renameFailed + ' A skill with that name already exists.'); return; }
            fs.renameSync(oldDir, newDir);
            // Sync name: in SKILL.md frontmatter
            const newSkillMdPath = path.join(newDir, 'SKILL.md');
            if (fs.existsSync(newSkillMdPath)) {
                let content = fs.readFileSync(newSkillMdPath, 'utf8');
                fs.writeFileSync(newSkillMdPath, this._updateFrontmatterName(content, newName), 'utf8');
            }
            this._panel.webview.postMessage({ command: 'loadSkills', skills: this._getSkills() });
        } catch (err) { vscode.window.showErrorMessage(this._i18n.renameFailed + ' ' + err.message); }
    }

    async _exportSkill(skillPath) {
        if (!skillPath || !fs.existsSync(skillPath)) return;
        const t = this._i18n;
        try {
            const uri = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file(path.basename(skillPath)), filters: { 'Markdown': ['md'] } });
            if (!uri) return;
            fs.copyFileSync(skillPath, uri.fsPath);
            vscode.window.showInformationMessage(t.exportSuccess);
        } catch (err) { vscode.window.showErrorMessage(t.exportFailed + ' ' + err.message); }
    }

    _exportCurrentSkill() {
        const skills = this._getSkills();
        if (skills.length > 0) this._exportSkill(skills[0].path);
    }

    async _duplicateSkill(skillPath) {
        if (!skillPath) return;
        const t = this._i18n;
        try {
            const oldDir = path.dirname(skillPath); const parentDir = path.dirname(oldDir);
            const baseName = path.basename(oldDir); let newName = baseName + '_copy'; let counter = 1;
            while (fs.existsSync(path.join(parentDir, newName))) { newName = baseName + '_copy_' + counter; counter++; }
            const newDir = path.join(parentDir, newName);
            if (fs.cpSync) fs.cpSync(oldDir, newDir, { recursive: true });
            vscode.window.showInformationMessage(t.duplicateSuccess);
            this._panel.webview.postMessage({ command: 'loadSkills', skills: this._getSkills() });
        } catch (err) { vscode.window.showErrorMessage(t.saveFailed + ' ' + err.message); }
    }

    async _importSkills() {
        const t = this._i18n;
        const uris = await vscode.window.showOpenDialog({ canSelectFiles: true, canSelectFolders: true, canSelectMany: true, openLabel: t.importBtn, filters: { 'Markdown': ['md', '*'] } });
        if (!uris || uris.length === 0) return;
        // Read file contents and send to webview to show the import modal
        const files = [];
        for (const fileUri of uris) {
            try {
                const stat = fs.statSync(fileUri.fsPath);
                if (stat.isDirectory()) {
                    // For directories, look for SKILL.md inside
                    const skillMd = path.join(fileUri.fsPath, 'SKILL.md');
                    if (fs.existsSync(skillMd)) {
                        files.push({ name: path.basename(fileUri.fsPath) + '.md', content: fs.readFileSync(skillMd, 'utf8') });
                    }
                } else if (fileUri.fsPath.endsWith('.md') || fileUri.fsPath.endsWith('.mdc')) {
                    files.push({ name: path.basename(fileUri.fsPath), content: fs.readFileSync(fileUri.fsPath, 'utf8') });
                }
            } catch (e) { /* skip unreadable files */ }
        }
        if (files.length > 0) {
            this._panel.webview.postMessage({ command: 'showImportModal', files });
        }
    }

    async _handleDroppedContent(message) {
        const files = message.files; const skillName = message.skillName; const isGlobal = message.isGlobal;
        if (!files || files.length === 0 || !skillName) return;
        const t = this._i18n; let targetDir = null; const paths = this._getEditorPaths();
        if (isGlobal) { targetDir = paths.global; } else { const wsPath = this._getWorkspacePath(); if (!wsPath) { vscode.window.showErrorMessage(t.wsError); return; } targetDir = this._getProjectSkillDir(wsPath); }
        try {
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            let count = 0;
            for (const fileObj of files) {
                let useName = files.length === 1 ? skillName : (skillName + '_' + count);
                let destDir = path.join(targetDir, useName);

                // Collision detection
                if (fs.existsSync(destDir)) {
                    const action = await vscode.window.showWarningMessage(
                        this._i18n.overwritePrompt.replace('{0}', useName),
                        { modal: true },
                        this._i18n.overwriteBtn, this._i18n.createCopyBtn
                    );
                    if (action === this._i18n.overwriteBtn) {
                        fs.rmSync(destDir, { recursive: true, force: true });
                    } else if (action === this._i18n.createCopyBtn) {
                        useName = useName + '_Copy_' + Date.now();
                        destDir = path.join(targetDir, useName);
                    } else {
                        // Cancelled
                        continue;
                    }
                }

                if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
                fs.writeFileSync(path.join(destDir, 'SKILL.md'), this._updateFrontmatterName(fileObj.content, useName), 'utf8'); count++;
            }
            if (count > 0) {
                vscode.window.showInformationMessage(t.importSuccess + ' (' + count + ')');
                this._panel.webview.postMessage({ command: 'loadSkills', skills: this._getSkills() });
            }
        } catch (err) { vscode.window.showErrorMessage(t.importFailed + ' ' + err.message); }
    }

    _createSkill(skillName, isGlobal = true, description = '', body = '') {
        if (!skillName) return;
        const t = this._i18n; let targetDir = null; const paths = this._getEditorPaths();
        if (isGlobal) { targetDir = paths.global; } else { const wsPath = this._getWorkspacePath(); if (!wsPath) { vscode.window.showErrorMessage(t.wsError); return; } targetDir = this._getProjectSkillDir(wsPath); }
        try {
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            const newSkillDir = path.join(targetDir, skillName);
            if (!fs.existsSync(newSkillDir)) fs.mkdirSync(newSkillDir);
            const skillMdPath = path.join(newSkillDir, 'SKILL.md');
            if (!fs.existsSync(skillMdPath)) {
                fs.writeFileSync(skillMdPath, createSkillContent(skillName, description, body), 'utf8');
            }
            this._panel.webview.postMessage({ command: 'loadSkills', skills: this._getSkills() });
        } catch (err) { vscode.window.showErrorMessage(t.createFailed + ' ' + err.message); }
    }

    _writeToClipboardExact(payload, count) {
        try {
            if (!payload || count === 0) { vscode.env.clipboard.writeText(''); vscode.window.showInformationMessage(this._i18n.deselected); }
            else { vscode.env.clipboard.writeText(payload); vscode.window.showInformationMessage(this._i18n.copySuccess.replace('{0}', count).replace('{1}', count > 1 ? 's' : '')); }
        } catch (err) { vscode.window.showErrorMessage(this._i18n.saveFailed + ' ' + err.message); }
    }

    _getHtmlForWebview() {
        const t = this._i18n;
        const currentLang = this._lang;
        const langOptions = Object.entries(translations).map(([code, tr]) =>
            `<option value="${code}" ${code === currentLang ? 'selected' : ''}>${tr.name}</option>`
        ).join('');
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
                    :root { --sidebar-width: 280px; --header-height: 48px; --transition-speed: 0.18s; --radius: 6px; }
                    * { box-sizing: border-box; }
                    body { font-family: var(--vscode-font-family); padding: 0; margin: 0; color: var(--vscode-editor-foreground); background-color: var(--vscode-editor-background); display: flex; height: 100vh; overflow: hidden; }
                    .sidebar { width: var(--sidebar-width); min-width: 180px; max-width: 80%; background-color: var(--vscode-sideBar-background); border-right: 1px solid var(--vscode-widget-border, var(--vscode-panel-border)); display: flex; flex-direction: column; z-index: 10; position: relative; }
                    .resizer { width: 4px; cursor: col-resize; background-color: transparent; transition: background-color 0.2s; z-index: 20; margin-right: -2px; margin-left: -2px; }
                    .resizer:hover, .resizer.active { background-color: var(--vscode-focusBorder); }
                    .sidebar-header { height: var(--header-height); padding: 0 12px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border)); }
                    .sidebar-title { font-weight: 700; font-size: 15px; color: var(--vscode-sideBarTitle-foreground); letter-spacing: 0.3px; }
                    .header-actions { display: flex; gap: 2px; align-items: center; }
                    .add-btn { background: transparent; border: none; color: var(--vscode-icon-foreground); cursor: pointer; padding: 5px; border-radius: var(--radius); display: flex; align-items: center; justify-content: center; transition: all var(--transition-speed); }
                    .add-btn:hover { background-color: var(--vscode-toolbar-hoverBackground); transform: scale(1.05); }
                    /* Search bar */
                    .search-container { padding: 6px 10px; border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border)); }
                    .search-input { width: 100%; background-color: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 5px 8px 5px 28px; font-size: 12px; border-radius: var(--radius); outline: none; font-family: inherit; transition: border-color var(--transition-speed); }
                    .search-input:focus { border-color: var(--vscode-focusBorder); }
                    .search-wrapper { position: relative; }
                    .search-icon { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; fill: var(--vscode-descriptionForeground); opacity: 0.6; pointer-events: none; }
                    /* Filter tabs */
                    .filter-tabs { display: flex; gap: 4px; padding: 6px 10px 4px; }
                    .filter-tab { background: transparent; border: 1px solid transparent; color: var(--vscode-descriptionForeground); cursor: pointer; padding: 2px 8px; font-size: 11px; border-radius: 12px; transition: all var(--transition-speed); font-family: inherit; }
                    .filter-tab:hover { background: rgba(128,128,128,0.15); }
                    .filter-tab.active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-color: var(--vscode-button-background); }
                    .skill-list { flex: 1; overflow-y: auto; padding: 4px 0; }
                    .skill-item { display: flex; align-items: center; padding: 6px 12px; cursor: pointer; border-left: 3px solid transparent; transition: all var(--transition-speed); font-size: 13px; color: var(--vscode-sideBar-foreground); gap: 8px; user-select: none; position: relative; }
                    .skill-item:hover { background-color: var(--vscode-list-hoverBackground); }
                    .skill-item.active { background-color: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); border-left-color: var(--vscode-focusBorder); }
                    .skill-item.dragging { opacity: 0.5; }
                    .skill-item.drag-over { border-top: 2px solid var(--vscode-focusBorder); }
                    .skill-item .skill-info { flex: 1; min-width: 0; }
                    .skill-item .skill-name { text-overflow: ellipsis; white-space: nowrap; overflow: hidden; display: block; }
                    .skill-item .skill-desc { font-size: 10px; color: var(--vscode-descriptionForeground); opacity: 0.7; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; display: block; margin-top: 1px; }
                    .icon-container { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin-right: 6px; border-radius: 4px; cursor: pointer; transition: all var(--transition-speed); flex-shrink: 0; }
                    .icon-container:hover { background: rgba(128,128,128,0.2); }
                    .skill-item.selected .icon-container { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
                    .main-area { flex: 1; display: flex; flex-direction: column; background-color: var(--vscode-editor-background); min-width: 0; }
                    .editor-header { min-height: var(--header-height); padding: 6px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border)); background-color: var(--vscode-editorGroupHeader-tabsBackground, var(--vscode-editor-background)); gap: 8px; }
                    .skill-title-container { display: flex; flex-direction: column; justify-content: center; min-width: 0; flex: 1; }
                    .skill-title { font-size: 14px; font-weight: 600; color: var(--vscode-editor-foreground); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
                    .skill-path-wrapper { display: flex; align-items: center; max-width: 100%; margin-top: 2px; }
                    .skill-path { font-size: 11px; color: var(--vscode-descriptionForeground); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; opacity: 0.7; }
                    .copy-path-btn { position: relative; width: 16px; height: 16px; margin-left: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--vscode-descriptionForeground); opacity: 0; transition: opacity var(--transition-speed); flex-shrink: 0; }
                    .skill-path-wrapper:hover .copy-path-btn { opacity: 0.7; }
                    .copy-path-btn:hover { opacity: 1 !important; color: var(--vscode-foreground); }
                    .copy-path-btn svg { width: 14px; height: 14px; }
                    .copy-path-tooltip { display: none; position: absolute; left: 50%; transform: translateX(-50%); bottom: 100%; margin-bottom: 4px; background-color: var(--vscode-editorHoverWidget-background, #252526); color: var(--vscode-editorHoverWidget-foreground, #cccccc); border: 1px solid var(--vscode-editorHoverWidget-border, #454545); padding: 4px 8px; font-size: 11px; border-radius: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); z-index: 10; white-space: nowrap; pointer-events: none; opacity: 0; animation: fadeIn 0.1s forwards; }
                    @keyframes fadeIn { to { opacity: 1; } }
                    .copy-path-tooltip::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border-width: 5px; border-style: solid; border-color: var(--vscode-editorHoverWidget-border, #454545) transparent transparent transparent; }
                    .copy-path-btn:hover .copy-path-tooltip { display: block; }

                    .save-btn { background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; height: 28px; padding: 0 10px; font-size: 12px; border-radius: 4px; cursor: pointer; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 4px; transition: all var(--transition-speed); white-space: nowrap; flex-shrink: 0; }
                    .save-btn:hover { background-color: var(--vscode-button-hoverBackground); transform: translateY(-1px); }
                    .save-btn:active { transform: translateY(0); }
                    .save-btn span { display: inline-block; }
                    .save-btn.icon-only { padding: 0; width: 28px; }
                    .save-btn.secondary { background-color: var(--vscode-button-secondaryBackground, transparent); color: var(--vscode-foreground); border: 1px solid var(--vscode-button-border, var(--vscode-widget-border)); }
                    .save-btn.destructive { background-color: var(--vscode-errorForeground); color: #fff; }
                    .editor-container { flex: 1; position: relative; display: flex; flex-direction: column; overflow: hidden; }
                    textarea { flex: 1; width: 100%; height: 100%; background-color: transparent; color: var(--vscode-editor-foreground); border: none; padding: 16px 20px; font-family: var(--vscode-editor-font-family, 'Menlo', 'Monaco', 'Courier New', monospace); font-size: var(--vscode-editor-font-size, 13px); line-height: 1.6; resize: none; outline: none; white-space: pre; overflow-wrap: normal; overflow-x: auto; }
                    textarea::selection { background-color: var(--vscode-editor-selectionBackground); }
                    .empty-state { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; color: var(--vscode-descriptionForeground); font-size: 14px; gap: 8px; }
                    .empty-state svg { width: 48px; height: 48px; opacity: 0.4; }
                    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.55); display: none; justify-content: center; align-items: center; z-index: 100; }
                    .modal-overlay.active { display: flex; }
                    .modal { background-color: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-widget-border); border-radius: 8px; padding: 24px; width: 420px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5); display: flex; flex-direction: column; gap: 14px; animation: modalIn 0.15s ease-out; }
                    @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(-8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                    .modal h3 { margin: 0; font-size: 16px; font-weight: 600; }
                    .modal input[type="text"], .modal select { background-color: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 8px 12px; font-size: 13px; border-radius: 4px; outline: none; font-family: inherit; transition: border-color var(--transition-speed); }
                    .modal input[type="text"]:focus, .modal select:focus { border-color: var(--vscode-focusBorder); }
                    .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
                    .modal-btn { padding: 6px 14px; font-size: 12px; border-radius: 4px; cursor: pointer; border: none; font-weight: 500; transition: all var(--transition-speed); }
                    .modal-btn.secondary { background-color: var(--vscode-button-secondaryBackground, transparent); color: var(--vscode-button-secondaryForeground, var(--vscode-foreground)); }
                    .modal-btn.secondary:hover { background-color: var(--vscode-button-secondaryHoverBackground, rgba(255,255,255,0.1)); }
                    .modal-btn.primary { background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); }
                    .modal-btn.primary:hover { background-color: var(--vscode-button-hoverBackground); }
                    .sidebar-footer { padding: 6px 10px; border-top: 1px solid var(--vscode-widget-border, var(--vscode-panel-border)); display: flex; align-items: center; gap: 6px; }
                    .sidebar-footer .total-count { font-size: 11px; color: var(--vscode-descriptionForeground); opacity: 0.7; white-space: nowrap; }
                    .lang-select { flex: 1; background-color: var(--vscode-dropdown-background, var(--vscode-input-background)); color: var(--vscode-dropdown-foreground, var(--vscode-input-foreground)); border: 1px solid var(--vscode-dropdown-border, var(--vscode-input-border)); padding: 3px 6px; font-size: 11px; border-radius: 4px; outline: none; cursor: pointer; font-family: inherit; }
                    .lang-select:focus { border-color: var(--vscode-focusBorder); }
                    .icon { width: 16px; height: 16px; fill: currentColor; }
                    .file-drop-active::before { content: ''; position: fixed; inset: 0; background: rgba(0, 120, 212, 0.12); border: 2px dashed var(--vscode-focusBorder); z-index: 10000; pointer-events: none; border-radius: 8px; }
                    .context-menu { position: fixed; z-index: 99999; background: var(--vscode-menu-background, var(--vscode-dropdown-background)); border: 1px solid var(--vscode-menu-border, var(--vscode-dropdown-border)); border-radius: var(--radius); padding: 4px 0; min-width: 170px; box-shadow: 0 4px 20px rgba(0,0,0,0.35); display: none; animation: modalIn 0.1s ease-out; }
                    .context-menu.active { display: block; }
                    .context-menu-item { display: flex; align-items: center; gap: 8px; padding: 6px 14px; font-size: 12px; color: var(--vscode-menu-foreground, var(--vscode-foreground)); cursor: pointer; user-select: none; transition: background var(--transition-speed); }
                    .context-menu-item:hover { background: var(--vscode-menu-selectionBackground, var(--vscode-list-hoverBackground)); }
                    .context-menu-item .icon { width: 14px; height: 14px; flex-shrink: 0; }
                    .context-menu-item.destructive:hover { background: var(--vscode-errorForeground); color: #fff; }
                    .context-menu-separator { height: 1px; background: var(--vscode-widget-border); margin: 4px 8px; }
                    .badge { font-size: 9px; padding: 1px 5px; border-radius: 8px; margin-left: auto; flex-shrink: 0; }
                    .badge-global { background: rgba(128,128,128,0.2); }
                    .badge-project { background: rgba(80,140,200,0.2); color: var(--vscode-textLink-foreground); }
                    @media (max-width: 600px) {
                        .sidebar { width: 100%; flex: none; max-width: none; height: 40%; border-right: none; border-bottom: 1px solid var(--vscode-widget-border); }
                        body { flex-direction: column; }
                        .editor-header { padding: 0 12px; }
                        .skill-path { display: none; }
                        .save-btn span { display: none; }
                        .save-btn { width: 32px; padding: 0; gap: 0; }

                    }
                </style>
            </head>
            <body>
                <div class="sidebar" id="sidebar">
                    <div class="sidebar-header">
                        <div class="sidebar-title">${t.title}</div>
                        <div class="header-actions">
                            <button class="add-btn" id="clearBtn" title="${t.clearCart}" style="display:none; color: var(--vscode-errorForeground);">
                                <svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 13a6 6 0 1 1 0-12 6 6 0 0 1 0 12z"/><path d="M11.35 4.65a.5.5 0 0 0-.7-.7l-6 6a.5.5 0 0 0 .7.7l6-6z"/></svg>
                            </button>
                            <button class="add-btn" id="importBtn" title="${t.importBtn}">
                                <svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M11.5 1h-7l-.5.5V5H1.5l-.5.5v9l.5.5h13l.5-.5v-9l-.5-.5H12V1.5l-.5-.5zM5 2h6v3H5V2zm9 12H2V6h12v8z"/><path d="M5 8h6v1H5z"/></svg>
                            </button>
                            <button class="add-btn" id="newSkillBtn" title="${t.create}">
                                <svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M14 7v1H8v6H7V8H1V7h6V1h1v6h6z"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="search-container">
                        <div class="search-wrapper">
                            <svg class="search-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M15.25 13.65L11.5 9.9A5.5 5.5 0 1 0 9.9 11.5l3.75 3.75a1 1 0 0 0 1.41 0l.19-.19a1 1 0 0 0 0-1.41zM6.5 10.5a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/></svg>
                            <input type="text" class="search-input" id="searchInput" placeholder="${t.searchPlaceholder}" autocomplete="off">
                        </div>
                    </div>
                    <div class="filter-tabs" id="filterTabs">
                        <button class="filter-tab active" data-filter="all">${t.filterAll}</button>
                        <button class="filter-tab" data-filter="Global">${t.globalBadge}</button>
                        <button class="filter-tab" data-filter="Project">${t.projectBadge}</button>
                    </div>
                    <div class="skill-list" id="skillList"></div>
                    <div class="sidebar-footer">
                        <select class="lang-select" id="langSelect">${langOptions}</select>
                        <span class="total-count" id="totalCount"></span>
                    </div>
                </div>
                <div class="resizer" id="resizer"></div>
                <div class="main-area" id="mainArea">
                    <div class="empty-state">
                        <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M13.5 2h-12l-.5.5v11l.5.5h12l.5-.5v-11l-.5-.5zM2 3h11v1H2V3zm7 4H2V6h7v1zm0 2H2V8h7v1zm-3 2H2v-1h4v1zm7 0h-2v-1h2v1zm0-2h-2V8h2v1zm0-2h-2V6h2v1z"/></svg>
                        <div>${t.empty}</div>
                    </div>
                </div>

                <!-- Create Modal -->
                <div class="modal-overlay" id="createModal">
                    <div class="modal" style="width:480px;">
                        <h3>${t.create}</h3>
                        <input type="text" id="newSkillInput" placeholder="${t.placeholder}" autocomplete="off">
                        <input type="text" id="newSkillDesc" placeholder="${t.descPlaceholder || 'Description (optional)'}" autocomplete="off">
                        <textarea id="newSkillBody" placeholder="${t.contentPlaceholder || 'Content (optional)'}" style="background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);padding:8px 12px;font-size:13px;border-radius:4px;outline:none;font-family:var(--vscode-editor-font-family,monospace);resize:vertical;min-height:100px;max-height:240px;line-height:1.5;" spellcheck="false"></textarea>
                        <div style="display:flex; gap:16px;">
                            <label style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer;">
                                <input type="radio" name="skillType" value="global" checked> ${t.importGlobal}
                            </label>
                            <label style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer;">
                                <input type="radio" name="skillType" value="project"> ${t.importProject}
                            </label>
                        </div>
                        <div class="modal-actions">
                            <button class="modal-btn secondary" id="cancelCreateBtn">${t.cancel}</button>
                            <button class="modal-btn primary" id="confirmCreateBtn">${t.confirmCreate}</button>
                        </div>
                    </div>
                </div>

                <!-- Confirm Modal -->
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

                <!-- Import Modal -->
                <div class="modal-overlay" id="importModal">
                    <div class="modal">
                        <h3>${t.importBtn}</h3>
                        <input type="text" id="importSkillInput" placeholder="${t.placeholder}" autocomplete="off">
                        <div style="display:flex; gap:16px;">
                            <label style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer;">
                                <input type="radio" name="importSkillType" value="global" checked> ${t.importGlobal}
                            </label>
                            <label style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer;">
                                <input type="radio" name="importSkillType" value="project"> ${t.importProject}
                            </label>
                        </div>
                        <div class="modal-actions">
                            <button class="modal-btn secondary" id="cancelImportBtn">${t.cancel}</button>
                            <button class="modal-btn primary" id="confirmImportBtn">${t.importBtn}</button>
                        </div>
                    </div>
                </div>

                <!-- Rename Modal -->
                <div class="modal-overlay" id="renameModal">
                    <div class="modal">
                        <h3>${t.renameTitle}</h3>
                        <div style="font-size: 13px; color: var(--vscode-descriptionForeground); margin-bottom: 4px;">${t.renameMsg}</div>
                        <input type="text" id="renameSkillInput" placeholder="${t.renamePlaceholder}" autocomplete="off">
                        <div class="modal-actions">
                            <button class="modal-btn secondary" id="cancelRenameBtn">${t.cancel}</button>
                            <button class="modal-btn primary" id="confirmRenameBtn">${t.renameBtn}</button>
                        </div>
                    </div>
                </div>

                <!-- Context Menu -->
                <div class="context-menu" id="ctxMenu">
                    <div class="context-menu-item" id="ctxRename">
                        <svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M13.23 1h-1.46L3.52 9.25l-.16.22L1 13.59 2.41 15l4.12-2.36.22-.16L15 4.23V2.77L13.23 1zM2.41 13.59l1.51-3 1.45 1.45-2.96 1.55zm3.83-2.06L4.47 9.76l8-8 1.77 1.77-8 8z"/></svg>
                        <span>${t.renameBtn}</span>
                    </div>
                    <div class="context-menu-separator"></div>
                    <div class="context-menu-item destructive" id="ctxDelete">
                        <svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M14 3h-3V1H5v2H2v1h1v11h10V4h1V3zM6 2h4v1H6V2zm6 12H4V4h8v10z"/><path d="M6 6h1v6H6zm3 0h1v6H9z"/></svg>
                        <span>${t.deleteConfirmTitle}</span>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const t = ${tJson};
                    let skills = [];
                    let currentIndex = -1;
                    let selectedSkills = new Set();
                    let selectedSkillsMap = new Map();
                    let searchQuery = '';
                    let filterType = 'all';
                    let unsavedPaths = new Set();

                    const skillList = document.getElementById('skillList');
                    const mainArea = document.getElementById('mainArea');
                    const newSkillBtn = document.getElementById('newSkillBtn');
                    const clearBtn = document.getElementById('clearBtn');
                    function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

                    document.getElementById('langSelect').addEventListener('change', (e) => {
                        vscode.postMessage({ command: 'changeLang', lang: e.target.value });
                    });

                    // Search
                    searchInput.addEventListener('input', (e) => { searchQuery = e.target.value.toLowerCase(); renderList(); });

                    // Filter tabs
                    document.getElementById('filterTabs').addEventListener('click', (e) => {
                        const tab = e.target.closest('.filter-tab');
                        if (!tab) return;
                        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                        tab.classList.add('active');
                        filterType = tab.getAttribute('data-filter');
                        renderList();
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
                                mainArea.innerHTML = '<div class="empty-state"><svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M13.5 2h-12l-.5.5v11l.5.5h12l.5-.5v-11l-.5-.5zM2 3h11v1H2V3zm7 4H2V6h7v1zm0 2H2V8h7v1zm-3 2H2v-1h4v1zm7 0h-2v-1h2v1zm0-2h-2V8h2v1zm0-2h-2V6h2v1z"/></svg><div>' + t.noSkills + '</div></div>';
                            }
                        } else if (message.command === 'showImportModal') {
                            showImportModal(message.files);
                        } else if (message.command === 'switchApproved') {
                            if (message.save && currentIndex !== -1 && skills[currentIndex]) {
                                const c = document.getElementById('skillContent');
                                if (c) { vscode.postMessage({ command: 'saveSkill', skillPath: skills[currentIndex].path, content: c.value }); unsavedPaths.delete(skills[currentIndex].path); }
                            } else if (!message.save && currentIndex !== -1 && skills[currentIndex]) {
                                unsavedPaths.delete(skills[currentIndex].path);
                            }
                            if (pendingSwitchIndex !== -1) renderEditor(pendingSwitchIndex);
                        }
                    });

                    let lastSelectedIndex = -1;
                    let pendingSwitchIndex = -1;

                    function getFilteredSkills() {
                        return skills.filter((s, i) => {
                            if (filterType !== 'all' && s.type !== filterType) return false;
                            if (searchQuery && !(s.displayName || s.name).toLowerCase().includes(searchQuery) && !s.name.toLowerCase().includes(searchQuery) && !(s.description || '').toLowerCase().includes(searchQuery)) return false;
                            return true;
                        });
                    }

                    function renderList() {
                        const filtered = getFilteredSkills();
                        var html = '';
                        for (var fi = 0; fi < filtered.length; fi++) {
                            var skill = filtered[fi];
                            var realIndex = skills.indexOf(skill);
                            var isSelected = selectedSkills.has(skill.path);
                            var activeClass = (realIndex === currentIndex) ? ' active' : '';
                            var selectedClass = isSelected ? ' selected' : '';
                            var unsavedClass = unsavedPaths.has(skill.path) ? ' has-unsaved' : '';
                            var iconColor = isSelected ? 'var(--vscode-button-foreground)' : 'var(--vscode-descriptionForeground)';
                            var iconOpacity = isSelected ? '1' : '0.6';
                            var iconHtml = '<div class="icon-container" data-action="toggle-select"><svg class="icon" style="color:' + iconColor + '; opacity:' + iconOpacity + '" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6" fill="currentColor" opacity="0.3"/><text x="8" y="11" text-anchor="middle" font-size="9" font-weight="bold" fill="currentColor">@</text></svg></div>';
                            var badge = '';
                            if (skill.type === 'Global') badge = '<span class="badge badge-global">' + t.globalBadge + '</span>';
                            else if (skill.type === 'Project') badge = '<span class="badge badge-project">' + (t.projectBadge || 'Project') + '</span>';
                            var descLine = skill.description ? '<span class="skill-desc">' + escHtml(skill.description) + '</span>' : '';
                            var showName = skill.displayName || skill.name;
                            html += '<div class="skill-item' + activeClass + selectedClass + unsavedClass + '" data-index="' + realIndex + '" draggable="true">'
                                + iconHtml
                                + '<div class="skill-info"><span class="skill-name">' + escHtml(showName) + '</span>' + descLine + '</div>'
                                + badge
                                + '</div>';
                        }
                        if (filtered.length === 0 && skills.length > 0) {
                            html = '<div style="padding:20px;text-align:center;color:var(--vscode-descriptionForeground);font-size:13px;">' + t.noResults + '</div>';
                        }
                        skillList.innerHTML = html;
                        if (clearBtn) clearBtn.style.display = (selectedSkills.size > 0) ? 'flex' : 'none';
                        if (totalCount) totalCount.textContent = t.totalSkills + ': ' + skills.length;
                    }

                    function toggleSkillSelection(index, force) {
                        const skill = skills[index]; if (!skill) return;
                        if (force === true) { selectedSkills.add(skill.path); selectedSkillsMap.set(skill.path, '[' + skill.name + '](file://' + skill.path + ')'); }
                        else if (force === false) { selectedSkills.delete(skill.path); selectedSkillsMap.delete(skill.path); }
                        else { if (selectedSkills.has(skill.path)) { selectedSkills.delete(skill.path); selectedSkillsMap.delete(skill.path); } else { selectedSkills.add(skill.path); selectedSkillsMap.set(skill.path, '[' + skill.name + '](file://' + skill.path + ')'); } }
                        renderList();
                        if (currentIndex === index) renderEditor(index);
                        var payloadArray = Array.from(selectedSkillsMap.values());
                        vscode.postMessage({ command: 'writeToClipboardExact', payload: payloadArray.join(' '), count: payloadArray.length });
                    }

                    function renderEditor(index) {
                        currentIndex = index; renderList();
                        const skill = skills[index]; if (!skill) return;
                        const content = skill.content || '';

                        mainArea.innerHTML = '<div class="editor-header">'
                            + '<div class="skill-title-container"><div class="skill-title">' + escHtml(skill.displayName || skill.name) + '</div><div class="skill-path-wrapper"><div class="skill-path">' + escHtml(skill.path) + '</div><div class="copy-path-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><div class="copy-path-tooltip">' + t.copyPath + '</div></div></div></div>'
                            + '<div style="display:flex; gap:4px; flex-shrink:0;">'
                            + '<button class="save-btn secondary" id="exportBtn" title="' + t.exportBtn + '"><svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 1L5 4h2v5h2V4h2L8 1zM2 10v4h12v-4h-1v3H3v-3H2z"/></svg><span>' + t.exportBtn + '</span></button>'
                            + (skill.type === 'Global' ? '<button class="save-btn secondary" id="copyToChatBtn" title="' + t.copyToChat + '"><svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h4v1H4V4zm0 2h5v1H4V6zm0 2h5v1H4V8zm7.5-6H3l-.5.5v11l.5.5h8l.5-.5V4.5L11.5 2zM3 14V3h8v11H3zM13 1h-8v1h8v12h1V1.5l-.5-.5h-.5z"/></svg><span>' + t.copyToChat + '</span></button>' : '')
                            + '<button class="save-btn destructive icon-only" id="deleteBtn" title="' + t.deleteConfirmTitle + '"><svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M14 3h-3V1H5v2H2v1h1v11h10V4h1V3zM6 2h4v1H6V2zm6 12H4V4h8v10z"/><path d="M6 6h1v6H6zm3 0h1v6H9z"/></svg></button>'
                            + '<button class="save-btn" id="saveBtn" title="' + t.saveBtn + '"><svg class="icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M13 1H3l-1.5 1.5v11L3 15h10l1.5-1.5v-11L13 1zM3 14V3h9v11H3zm7-10H4v4h6V4z"/></svg><span>' + t.saveBtn + '</span></button>'
                            + '</div></div>'
                            + '<div class="editor-container">'
                            + '<textarea id="skillContent" spellcheck="false"></textarea>'
                            + '</div>';

                        const ta = document.getElementById('skillContent');
                        ta.value = content;
                        
                        // Copy path
                        const copyBtnEl = mainArea.querySelector('.copy-path-btn');
                        if (copyBtnEl) {
                            copyBtnEl.addEventListener('click', (e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(skill.path).catch(err => {
                                    const tmp = document.createElement('textarea');
                                    tmp.value = skill.path;
                                    document.body.appendChild(tmp);
                                    tmp.select();
                                    document.execCommand('copy');
                                    document.body.removeChild(tmp);
                                });
                                const copiedText = t.copySuccess ? t.copySuccess.split('!')[0].split('！')[0] + (t.copySuccess.includes('！') ? '！' : '!') : 'Copied!';
                                vscode.postMessage({ command: 'showInfo', text: copiedText });
                            });
                        }

                        // Export
                        document.getElementById('exportBtn').addEventListener('click', () => { vscode.postMessage({ command: 'exportSkill', skillPath: skill.path }); });

                        // Copy to chat
                        const copyToChatBtn = document.getElementById('copyToChatBtn');
                        if (copyToChatBtn) {
                            if (selectedSkills.has(skill.path)) { copyToChatBtn.classList.add('preview-active'); copyToChatBtn.querySelector('span').textContent = t.selected; }
                            copyToChatBtn.addEventListener('click', () => { toggleSkillSelection(currentIndex); });
                        }

                        // Delete
                        document.getElementById('deleteBtn').addEventListener('click', () => { showConfirm(t.deleteConfirmTitle, t.deleteMsg, () => { vscode.postMessage({ command: 'deleteSkill', skillPath: skill.path }); }, true); });

                        // Save
                        document.getElementById('saveBtn').addEventListener('click', () => { 
                            if (!unsavedPaths.has(skill.path)) { vscode.postMessage({ command: 'showInfo', text: '您未做任何改动 (No changes made)' }); return; }
                            showConfirm(t.saveConfirmTitle, t.saveMsg, () => { const btn = document.getElementById('saveBtn'); btn.querySelector('span').textContent = t.saving; const c = document.getElementById('skillContent'); if (c) { vscode.postMessage({ command: 'saveSkill', skillPath: skill.path, content: c.value }); unsavedPaths.delete(skill.path); renderList(); } setTimeout(() => { try { btn.querySelector('span').textContent = t.saveBtn; } catch(e){} }, 500); }); 
                        });

                        // Track unsaved changes
                        if (ta) {
                            ta.addEventListener('input', () => { unsavedPaths.add(skill.path); renderList(); });
                            ta.addEventListener('keydown', (e) => {
                                if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); document.getElementById('saveBtn').click(); }
                                // Tab support
                                if (e.key === 'Tab') { e.preventDefault(); const start = ta.selectionStart; const end = ta.selectionEnd; ta.value = ta.value.substring(0, start) + '    ' + ta.value.substring(end); ta.selectionStart = ta.selectionEnd = start + 4; }
                            });
                        }
                    }

                    // Import button
                    importBtn.addEventListener('click', () => { vscode.postMessage({ command: 'importSkills' }); });

                    // Confirm modal
                    const confirmModal = document.getElementById('confirmModal');
                    const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
                    const acceptConfirmBtn = document.getElementById('acceptConfirmBtn');
                    let confirmCallback = null;
                    function showConfirm(title, message, callback, isDestructive) {
                        document.getElementById('confirmTitle').innerText = title;
                        document.getElementById('confirmMessage').innerText = message;
                        confirmCallback = callback;
                        acceptConfirmBtn.style.backgroundColor = isDestructive ? 'var(--vscode-errorForeground)' : '';
                        confirmModal.classList.add('active');
                    }
                    function closeConfirmModal() { confirmModal.classList.remove('active'); confirmCallback = null; acceptConfirmBtn.style.backgroundColor = ''; }
                    cancelConfirmBtn.addEventListener('click', closeConfirmModal);
                    acceptConfirmBtn.addEventListener('click', () => { if (confirmCallback) confirmCallback(); closeConfirmModal(); });
                    confirmModal.addEventListener('click', (e) => { if (e.target === confirmModal) closeConfirmModal(); });

                    // Skill list click
                    skillList.addEventListener('click', (e) => {
                        const target = e.target.closest('.skill-item'); const toggleAction = e.target.closest('[data-action="toggle-select"]');
                        if (target) {
                            const index = parseInt(target.getAttribute('data-index'));
                            if (toggleAction) {
                                if (e.shiftKey && lastSelectedIndex !== -1) { const start = Math.min(lastSelectedIndex, index); const end = Math.max(lastSelectedIndex, index); const sel = !selectedSkills.has(skills[index].path); for (let i = start; i <= end; i++) toggleSkillSelection(i, sel); }
                                else toggleSkillSelection(index);
                                lastSelectedIndex = index;
                            } else { 
                                if (currentIndex !== -1 && currentIndex !== index && skills[currentIndex] && unsavedPaths.has(skills[currentIndex].path)) {
                                    pendingSwitchIndex = index;
                                    vscode.postMessage({ command: 'confirmSwitch', skillName: skills[currentIndex].displayName || skills[currentIndex].name });
                                } else {
                                    renderEditor(index); lastSelectedIndex = index; 
                                }
                            }
                        }
                    });

                    // New skill button
                    newSkillBtn.addEventListener('click', () => { createModal.classList.add('active'); newSkillInput.value = ''; document.getElementById('newSkillDesc').value = ''; document.getElementById('newSkillBody').value = ''; setTimeout(() => newSkillInput.focus(), 100); });
                    function closeCreateModal() { createModal.classList.remove('active'); }
                    document.getElementById('cancelCreateBtn').addEventListener('click', closeCreateModal);
                    createModal.addEventListener('click', (e) => { if (e.target === createModal) closeCreateModal(); });
                    function createSkill() {
                        const val = newSkillInput.value.trim(); if (!val) { newSkillInput.focus(); return; }
                        const desc = document.getElementById('newSkillDesc').value.trim();
                        const body = document.getElementById('newSkillBody').value;
                        let isGlobal = true; const radios = document.getElementsByName('skillType'); for (const r of radios) { if (r.checked && r.value === 'project') isGlobal = false; }
                        vscode.postMessage({ command: 'createSkill', skillName: val, isGlobal, description: desc, body: body }); closeCreateModal();
                    }
                    document.getElementById('confirmCreateBtn').addEventListener('click', createSkill);
                    newSkillInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCreateModal(); });

                    // Clear selection
                    clearBtn.addEventListener('click', () => { selectedSkills.clear(); selectedSkillsMap.clear(); renderList(); if (currentIndex !== -1) renderEditor(currentIndex); vscode.postMessage({ command: 'writeToClipboardExact', payload: '', count: 0 }); });

                    // Context menu
                    const ctxMenu = document.getElementById('ctxMenu'); let ctxSkillIndex = -1;
                    function hideCtxMenu() { ctxMenu.classList.remove('active'); }
                    skillList.addEventListener('contextmenu', (e) => { e.preventDefault(); const target = e.target.closest('.skill-item'); if (!target) return; ctxSkillIndex = parseInt(target.getAttribute('data-index')); ctxMenu.style.left = e.clientX + 'px'; ctxMenu.style.top = e.clientY + 'px'; ctxMenu.classList.add('active'); });
                    document.addEventListener('click', hideCtxMenu);
                    document.addEventListener('contextmenu', (e) => { if (!e.target.closest('.skill-item') && !e.target.closest('.context-menu')) hideCtxMenu(); });

                    document.getElementById('ctxRename').addEventListener('click', (e) => { e.stopPropagation(); hideCtxMenu(); const skill = skills[ctxSkillIndex]; if (!skill) return; document.getElementById('renameSkillInput').value = skill.displayName || skill.name; pendingRenameSkillPath = skill.path; document.getElementById('renameModal').classList.add('active'); setTimeout(() => { document.getElementById('renameSkillInput').focus(); document.getElementById('renameSkillInput').select(); }, 150); });
                    document.getElementById('ctxDelete').addEventListener('click', () => { hideCtxMenu(); const skill = skills[ctxSkillIndex]; if (!skill) return; showConfirm(t.deleteConfirmTitle, t.deleteMsg, () => { vscode.postMessage({ command: 'deleteSkill', skillPath: skill.path }); }, true); });

                    // Rename modal
                    let pendingRenameSkillPath = null;
                    function closeRenameModal() { document.getElementById('renameModal').classList.remove('active'); pendingRenameSkillPath = null; }
                    document.getElementById('cancelRenameBtn').addEventListener('click', closeRenameModal);
                    document.getElementById('renameModal').addEventListener('click', (e) => { if (e.target === document.getElementById('renameModal')) closeRenameModal(); });
                    document.getElementById('confirmRenameBtn').addEventListener('click', () => { if (!pendingRenameSkillPath) return; const nn = document.getElementById('renameSkillInput').value.trim(); if (!nn) return; vscode.postMessage({ command: 'renameSkill', skillPath: pendingRenameSkillPath, newName: nn }); closeRenameModal(); });
                    document.getElementById('renameSkillInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('confirmRenameBtn').click(); } if (e.key === 'Escape') closeRenameModal(); });

                    // Keyboard shortcuts
                    document.addEventListener('keydown', (e) => {
                        // Cmd/Ctrl+F -> focus search
                        if ((e.metaKey || e.ctrlKey) && e.key === 'f') { e.preventDefault(); searchInput.focus(); searchInput.select(); return; }
                        // Cmd/Ctrl+N -> new skill
                        if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); newSkillBtn.click(); return; }
                        // Up/Down arrow in list (only when not in textarea/input)
                        if (!e.target.closest('textarea') && !e.target.closest('input')) {
                            if (e.key === 'ArrowUp' && currentIndex > 0) { e.preventDefault(); renderEditor(currentIndex - 1); }
                            if (e.key === 'ArrowDown' && currentIndex < skills.length - 1) { e.preventDefault(); renderEditor(currentIndex + 1); }
                        }
                    });

                    vscode.postMessage({ command: 'requestSkills' });

                    // Resizer
                    const resizer = document.getElementById('resizer'); const sidebar = document.getElementById('sidebar'); let isResizing = false;
                    resizer.addEventListener('mousedown', () => { isResizing = true; resizer.classList.add('active'); document.body.style.cursor = 'col-resize'; document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', stopResizing); });
                    function handleMouseMove(e) { if (!isResizing) return; if (e.clientX > 150 && e.clientX < window.innerWidth * 0.8) sidebar.style.width = e.clientX + 'px'; }
                    function stopResizing() { isResizing = false; resizer.classList.remove('active'); document.body.style.cursor = 'default'; document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', stopResizing); }

                    // Drag reorder
                    let draggedItemIndex = -1;
                    skillList.addEventListener('dragstart', (e) => { const item = e.target.closest('.skill-item'); if (item) { draggedItemIndex = parseInt(item.getAttribute('data-index')); item.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', draggedItemIndex); } });
                    skillList.addEventListener('dragover', (e) => { e.preventDefault(); const item = e.target.closest('.skill-item'); if (item) { item.classList.add('drag-over'); e.dataTransfer.dropEffect = 'move'; } });
                    skillList.addEventListener('dragleave', (e) => { const item = e.target.closest('.skill-item'); if (item) item.classList.remove('drag-over'); });
                    skillList.addEventListener('drop', (e) => {
                        e.preventDefault(); const targetItem = e.target.closest('.skill-item');
                        if (targetItem) { const targetIndex = parseInt(targetItem.getAttribute('data-index')); targetItem.classList.remove('drag-over');
                            if (draggedItemIndex !== -1 && draggedItemIndex !== targetIndex) { const item = skills.splice(draggedItemIndex, 1)[0]; skills.splice(targetIndex, 0, item);
                                if (currentIndex === draggedItemIndex) currentIndex = targetIndex; else if (draggedItemIndex < currentIndex && targetIndex >= currentIndex) currentIndex--; else if (draggedItemIndex > currentIndex && targetIndex <= currentIndex) currentIndex++;
                                renderList(); renderEditor(currentIndex); vscode.postMessage({ command: 'saveOrder', order: skills.map(s => s.path) }); } }
                    });
                    skillList.addEventListener('dragend', (e) => { const item = e.target.closest('.skill-item'); if (item) item.classList.remove('dragging'); skillList.querySelectorAll('.skill-item').forEach(i => i.classList.remove('drag-over')); draggedItemIndex = -1; });

                    // Import modal
                    const importModal = document.getElementById('importModal'); const importSkillInput = document.getElementById('importSkillInput'); let pendingImportFiles = null;
                    function showImportModal(files) { pendingImportFiles = files; let dn = ''; var content = files[0].content || ''; var fm = content.match(/^---\\s*\\n([\\s\\S]*?)\\n---/); if (fm) { var nm = fm[1].match(/name:\\s*(.+)/); if (nm && nm[1].trim()) dn = nm[1].trim(); } if (!dn) { dn = files[0].name.replace(/\\.(md|mdc)$/i, ''); if (['SKILL','README','skill','readme'].includes(dn)) dn = ''; } importSkillInput.value = dn; importModal.classList.add('active'); importSkillInput.focus(); importSkillInput.select(); }
                    document.getElementById('cancelImportBtn').addEventListener('click', () => { importModal.classList.remove('active'); pendingImportFiles = null; });
                    importModal.addEventListener('click', (e) => { if (e.target === importModal) { importModal.classList.remove('active'); pendingImportFiles = null; } });
                    document.getElementById('confirmImportBtn').addEventListener('click', () => { if (!pendingImportFiles) return; const sn = importSkillInput.value.trim(); if (!sn) { importSkillInput.focus(); return; } const isG = document.querySelector('input[name="importSkillType"]:checked').value === 'global'; importModal.classList.remove('active'); vscode.postMessage({ command: 'dropFilesContent', files: pendingImportFiles, skillName: sn, isGlobal: isG }); pendingImportFiles = null; });
                    importSkillInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('confirmImportBtn').click(); if (e.key === 'Escape') document.getElementById('cancelImportBtn').click(); });

                    // External drag-drop
                    (function() {
                        let isDraggingExternal = false;
                        document.addEventListener('dragenter', function(e) { if (e.dataTransfer && e.dataTransfer.types.indexOf('Files') !== -1) { isDraggingExternal = true; e.preventDefault(); e.stopImmediatePropagation(); document.body.classList.add('file-drop-active'); } }, true);
                        document.addEventListener('dragover', function(e) { if (isDraggingExternal || (e.dataTransfer && e.dataTransfer.types.indexOf('Files') !== -1)) { isDraggingExternal = true; e.preventDefault(); e.stopImmediatePropagation(); e.dataTransfer.dropEffect = 'copy'; } }, true);
                        document.addEventListener('dragleave', function(e) { if (isDraggingExternal && (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) { isDraggingExternal = false; document.body.classList.remove('file-drop-active'); } }, true);
                        document.addEventListener('drop', function(e) {
                            if (!isDraggingExternal) return; e.preventDefault(); e.stopImmediatePropagation(); isDraggingExternal = false; document.body.classList.remove('file-drop-active');
                            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                var fc = []; var pending = 0;
                                for (var i = 0; i < e.dataTransfer.files.length; i++) { var file = e.dataTransfer.files[i]; if (file.name.endsWith('.md') || file.name.endsWith('.mdc')) { pending++;
                                    (function(f) { var reader = new FileReader(); reader.onload = function(ev) { fc.push({ name: f.name, content: ev.target.result }); pending--; if (pending === 0 && fc.length > 0) showImportModal(fc); }; reader.onerror = function() { pending--; }; reader.readAsText(f); })(file); } }
                            }
                        }, true);
                    })();
                </script>
            </body>
            </html>
        `;
    }
}

/**
 * Static method: import files from explorer right-click context menu.
 */
SkillsPanel.importFromExplorer = function (filePaths) {
    if (!SkillsPanel.currentPanel) return;
    const panel = SkillsPanel.currentPanel;
    const t = panel._i18n;

    (async () => {
        const target = await vscode.window.showQuickPick([
            { label: '$(globe) ' + t.importGlobal, target: 'global' },
            { label: '$(folder) ' + t.importProject, target: 'project' }
        ], { placeHolder: t.importPickerTitle });
        if (!target) return;

        let targetDir = null;
        const paths = panel._getEditorPaths();
        if (target.target === 'global') { targetDir = paths.global; }
        else { const wsPath = panel._getWorkspacePath(); if (!wsPath) { vscode.window.showErrorMessage(t.wsError); return; } targetDir = panel._getProjectSkillDir(wsPath); }

        try {
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            let count = 0;
            for (const filePath of filePaths) {
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) { const dest = path.join(targetDir, path.basename(filePath)); if (fs.cpSync) fs.cpSync(filePath, dest, { recursive: true }); count++; }
                else if (filePath.endsWith('.md') || filePath.endsWith('.mdc')) {
                    let skillName = path.basename(filePath, path.extname(filePath));
                    if (['SKILL', 'README'].includes(skillName.toUpperCase())) skillName = path.basename(path.dirname(filePath));
                    if (!skillName) skillName = 'Skill_' + Date.now();
                    const destDir = path.join(targetDir, skillName);
                    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
                    fs.copyFileSync(filePath, path.join(destDir, 'SKILL.md')); count++;
                }
            }
            vscode.window.showInformationMessage(t.importSuccess + ' (' + count + ')');
            panel._panel.webview.postMessage({ command: 'loadSkills', skills: panel._getSkills() });
        } catch (err) { vscode.window.showErrorMessage(t.importFailed + ' ' + err.message); }
    })();
};

module.exports = SkillsPanel;
