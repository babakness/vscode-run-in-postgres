"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const ChildProcess = require("child_process");
const lineDecoder_1 = require("./lineDecoder");
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
class pgsqlCommandProvider {
    constructor() {
        this.executable = 'psql';
    }
    activate(subscriptions) {
        let cp = this;
        cp.outChannel = vscode_1.window.createOutputChannel("pgsql");
        vscode_1.workspace.onDidChangeConfiguration(cp.loadConfiguration, cp, subscriptions);
        cp.loadConfiguration();
    }
    loadConfiguration() {
        let section = vscode_1.workspace.getConfiguration('pgsql');
        if (section) {
            this.connection = section.get('connection', null);
        }
    }
    run() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return; // No open text editor
        }
        const text = editor.document.getText(editor.selection) || editor.document.getText();
        const isLanguageSQL = () => ['pgsql', 'sql'].includes(editor.document.languageId.toLowerCase());
        if (!text && !isLanguageSQL()) {
            vscode.window.showWarningMessage('Nothing selected + language is not SQL compatible');
        }
        // if(!text && !editor.document.isDirty && isLanguageSQL() ) {
        //     return this.runFile( editor.document.fileName )            
        // }
        return this.runText(text);
        // in any others cases, for example if ( doc.isUntitled ) 
    }
    // Create temporary file with given text and execute it via psql
    runText(text) {
        const pgsql = this;
        const rootPath = vscode_1.workspace.rootPath ? vscode_1.workspace.rootPath : __dirname;
        const uniqName = path.join(rootPath, (Date.now() - 0) + '.pgsql');
        fs.writeFile(uniqName, text, (err) => {
            if (err) {
                return pgsql.outChannel.appendLine('Can\'t create temporary file: ' + uniqName);
            }
            const cb = () => fs.unlink(uniqName, (err) => {
                if (err) {
                    pgsql.outChannel.appendLine('Can\'t delete temporary file: ' + uniqName);
                }
            });
            pgsql.runFile(uniqName, cb);
        });
    }
    runFile(fileName, cb) {
        let pgsql = this, args = [
            "-d", pgsql.connection,
            "-f", fileName
        ];
        pgsql.outChannel.show(vscode_1.ViewColumn.Two);
        let cp = ChildProcess.spawn(pgsql.executable, args);
        if (!cp.pid) {
            return pgsql.outChannel.appendLine('pgsql: can\'t spawn child process');
        }
        //args.unshift( pgsql.executable )
        //console.log( args.join(" ") )
        cp.on('error', (err) => {
            const errObject = err;
            let ecode = errObject.code;
            let defmsg = `Failed to run: ${pgsql.executable} ${args.join(' ')}. ${ecode}.`;
            let message = err.message || defmsg;
            if (errObject.code === 'ENOENT') {
                message = `The 'psql' program was not found. Please ensure the 'psql' is in your Path`;
            }
            vscode_1.window.showInformationMessage(message);
            if (cb)
                cb();
        });
        let decoder = new lineDecoder_1.default();
        pgsql.outChannel.show(vscode_1.ViewColumn.Two);
        cp.stdout.on('data', (data) => {
            decoder.write(data).forEach(function (line) {
                pgsql.outChannel.appendLine(line);
            });
        });
        cp.stderr.on('data', (data) => {
            decoder.write(data).forEach(function (line) {
                pgsql.outChannel.appendLine(line);
            });
        });
        cp.stdout.on('end', () => {
            pgsql.outChannel.appendLine('pgsql end.');
            if (cb)
                cb();
        });
    }
}
exports.default = pgsqlCommandProvider;
//# sourceMappingURL=pgsql.run.js.map