const vscode = require('vscode');
const SkillsPanel = require('./SkillsPanel');
const translations = require('./i18n');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

    let lang = context.globalState.get('ultraSkillsLang');
    if (!lang) {
        lang = vscode.env.language.toLowerCase();
    }
    const safeLang = translations[lang] ? lang : (translations[lang.split('-')[0]] ? lang.split('-')[0] : 'en');
    const i18n = translations[safeLang] || translations['en'];

    // Create a status bar item
    const myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    myStatusBarItem.command = 'antigravity-skills-editor.openSkillsEditor';
    myStatusBarItem.text = `$(tools) ${i18n.title}`;
    myStatusBarItem.tooltip = i18n.create;
    myStatusBarItem.show();
    context.subscriptions.push(myStatusBarItem);

    // Register command: open skills editor
    let disposable = vscode.commands.registerCommand('antigravity-skills-editor.openSkillsEditor', function () {
        SkillsPanel.createOrShow(context);
    });
    context.subscriptions.push(disposable);

    // Register command: import skill from file explorer right-click menu
    let importDisposable = vscode.commands.registerCommand('antigravity-skills-editor.importSkillFromExplorer', function (uri, selectedUris) {
        // selectedUris contains all selected files when multi-select, uri is the right-clicked file
        const uris = (selectedUris && selectedUris.length > 0) ? selectedUris : (uri ? [uri] : []);
        if (uris.length === 0) return;

        // Ensure the panel exists
        SkillsPanel.createOrShow(context);

        // Slight delay to ensure panel is ready, then trigger import
        setTimeout(() => {
            SkillsPanel.importFromExplorer(uris.map(u => u.fsPath));
        }, 300);
    });
    context.subscriptions.push(importDisposable);
}

function deactivate() { }

module.exports = {
    activate,
    deactivate
}
