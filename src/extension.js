const vscode = require('vscode');
const SkillsPanel = require('./SkillsPanel');
const translations = require('./i18n');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Antigravity Skills Editor is now active!');

    let lang = context.globalState.get('antigravitySkillsLang');
    if (!lang) {
        lang = vscode.env.language.toLowerCase();
    }
    const safeLang = translations[lang] ? lang : (translations[lang.split('-')[0]] ? lang.split('-')[0] : 'en');
    const i18n = translations[safeLang] || translations['en'];

    // Create a status bar item
    const myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    myStatusBarItem.command = 'antigravity-skills-editor.openSkillsEditor';
    myStatusBarItem.text = `$(tools) ${i18n.title}`;
    myStatusBarItem.tooltip = i18n.create; // just reuse some text
    myStatusBarItem.show();
    context.subscriptions.push(myStatusBarItem);

    // Register command
    let disposable = vscode.commands.registerCommand('antigravity-skills-editor.openSkillsEditor', function () {
        SkillsPanel.createOrShow(context);
    });

    context.subscriptions.push(disposable);
}

function deactivate() { }

module.exports = {
    activate,
    deactivate
}
