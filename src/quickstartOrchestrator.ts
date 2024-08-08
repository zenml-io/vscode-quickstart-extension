import * as vscode from "vscode";
import path from "path";
import { readFileSync } from "fs";
import getNonce from "./utils/getNonce";
import fileHasBackup from "./utils/fileBackupPath";
import fileBackupPath from "./utils/fileBackupPath";
import codeRunner from "./utils/codeRunner";
import Quickstart from "./quickstart";

export default class QuickstartOrchestrator {
  public editor: vscode.TextEditor | undefined;
  public currentlyDisplayingDocument: vscode.TextDocument | undefined;
  public context: vscode.ExtensionContext;
  public codeMatchesBackup = true;
  private _panel: vscode.WebviewPanel | undefined;
  private _terminal: vscode.Terminal | undefined;
  private _quickstart: Quickstart;

  constructor(context: vscode.ExtensionContext, quickstart: Quickstart) {
    this._quickstart = quickstart;
    this.context = context;
  }

  public start() {
    this._initializeRestoreCodeButtonListeners();
    vscode.window
      .createTerminal({ hideFromUser: true })
      .sendText("zenml init && zenml stack set default");
    this.openSection(0);
  }

  // setters & getters
  public set terminal(value: vscode.Terminal | undefined) {
    this._terminal = value;
  }

  public get terminal(): vscode.Terminal {
    if (this._terminal === undefined) {
      this._terminal = vscode.window.createTerminal("ZenML Terminal");
    }

    return this._terminal;
  }

  public get panel(): vscode.WebviewPanel {
    if (this._panel === undefined) {
      this._initializePanel();
    }

    return this._panel as vscode.WebviewPanel;
  }

  public async resetCode() {
    const doc = this.currentlyDisplayingDocument;
    if (!doc) {
      return;
    }

    await vscode.window.showTextDocument(doc, {
      preview: true,
      preserveFocus: false,
      viewColumn: vscode.ViewColumn.Two,
    });

    const activeEditor = vscode.window.activeTextEditor;

    // Guard against errors when file doesn't have backup or no activeEditor
    if (!fileHasBackup(doc.uri.fsPath) || !activeEditor) {
      return;
    }

    // Grab backup content path for current document to replace active document's content)
    const backupPath = doc.uri.fsPath.replace("sections", "sectionsBackup");

    //get the text from the backup
    const originalCode = readFileSync(backupPath, { encoding: "utf-8" });

    // A range that covers the entire document
    const documentRange = new vscode.Range(0, 0, doc.lineCount, Infinity);

    activeEditor.edit((editBuilder) => {
      editBuilder.replace(documentRange, originalCode);
    });

    activeEditor.document.save();
  }

  closeCurrentEditor() {
    const currentEditor = this.editor?.document;
    if (currentEditor) {
      vscode.window
        .showTextDocument(currentEditor, {
          preview: true,
          preserveFocus: false,
        })
        .then(() => {
          return vscode.commands.executeCommand(
            "workbench.action.closeActiveEditor"
          );
        });
    }
  }

  async back() {
    this._quickstart.back();
    this.openSection(this._quickstart.currentSection.index)
  }

  async openSection(sectionId: number) {
    this._quickstart.setCurrentSection(sectionId);

    if (this._quickstart.currentSection.code()) {
      await vscode.commands.executeCommand("vscode.setEditorLayout", {
        orientation: 0,
        groups: [
          { groups: [{}], size: 0.5 },
          { groups: [{}], size: 0.5 },
        ],
      });
      
      this.openCodePanel(this._quickstart.currentSection.code() as string);
    } else {
      this.closeCurrentEditor();
      await vscode.commands.executeCommand("vscode.setEditorLayout", {
        orientation: 0,
        groups: [{ groups: [{}], size: 1 }],
      });
    }

    this.openDocPanel(
      this._quickstart.currentSection.title,
      this._quickstart.currentSection.docHTML()
    );
  }

  openNextStep() {
    this._quickstart.currentSection.nextStep();
    this.openSection(this._quickstart.currentSection.index);
  }

  // Terminal
  public closeTerminal() {
    this.terminal?.hide();
  }

  sendTerminalCommand(command: string) {
    this.terminal.show(true);
    this.terminal.sendText(command);
  }

  async runCode(callback?: Function) {
    try {
      if (!this.editor) {
        throw new Error("Editor is not defined");
      }

      const activeEditorIsCurrentEditor =
        this.editor === vscode.window.activeTextEditor;

      if (!activeEditorIsCurrentEditor) {
        await vscode.window.showTextDocument(this.editor.document, {
          preview: true,
          preserveFocus: false,
          viewColumn: vscode.ViewColumn.Two,
        });
      }

      codeRunner(
        this.terminal,
        this.editor.document.uri,
        () => {
          vscode.window.showInformationMessage("Code Ran Successfully! 🎉");
          if (callback) {
            callback();
          }
          this.openNextStep();
        },
        () => {
          vscode.window.showErrorMessage("Code Run Encountered an Error. ❌");
        }
      );

      this.terminal.show(true);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to execute file: ${error}`);
    }
  }

  // HELPERS

  openDocPanel(title: string, docContent: string) {
    if (!this._panel) {
      this._initializePanel();
    }

    // nullcheck to make typescript happy
    if (this._panel) {
      this._panel.title = title;
      this._panel.webview.html = this._generateHTML(docContent);
    }
  }

  async openCodePanel(codePath: string) {
    const onDiskPath = path.join(this.context.extensionPath, codePath);
    const filePath = vscode.Uri.file(onDiskPath);
    try {
      const document = await vscode.workspace.openTextDocument(filePath);
      this.currentlyDisplayingDocument = document;
      this.editor = await vscode.window.showTextDocument(
        document,
        vscode.ViewColumn.Two
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${error}`);
    }
  }

  async openEditPanel(codePath: string) {
    const onDiskPath = path.join(this.context.extensionPath, codePath);
    const filePath = vscode.Uri.file(onDiskPath);
    try {
      const document = await vscode.workspace.openTextDocument(filePath);
      this.currentlyDisplayingDocument = document;
      await vscode.window.showTextDocument(document, vscode.ViewColumn.Two);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${error}`);
    }
  }

  // PRIVATE METHODS:
  private _initializePanel() {
    this._panel = vscode.window.createWebviewPanel(
      "zenml.markdown", // used internally - I think an identifier
      "Zenml", // displayed to user
      vscode.ViewColumn.One,
      {}
    );

    this._registerView();
    this._panel.onDidDispose(() => {
      this._panel = undefined;
    });
  }

  private _registerView() {
    this.panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    this.panel.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "openSection": {
          this.openSection(data.id);
          this.closeTerminal();
          break;
        }
        case "runCodeFile": {
          await this.runCode();
          break;
        }
        // for dev only
        case "editText": {
          this.openEditPanel(this._quickstart.currentSection.doc());
          break;
        }
        case "serverConnect": {
          this.sendTerminalCommand(`zenml connect --url "${data.url}"`);
          break;
        }
        case "localServerConnect": {
          this.sendTerminalCommand("zenml up");
          break;
        }
        case "nextStep": {
          this._quickstart.currentSection.nextStep();
          this.openSection(this._quickstart.currentSection.index);
          break;
        }
        case "next": {
          if (this._quickstart.currentSection.isDone()) {
            this.openSection(this._quickstart.currentSection.index + 1);
            this.closeTerminal();
          } else {
            this._quickstart.currentSection.nextStep();
            this.openSection(this._quickstart.currentSection.index);
          }
          break;
        }
        case "resetCodeFile": {
          this.resetCode();
          break;
        }
        case "previous": {
          this.back();
          break;
        }
      }
    });
  }

  private _checkCodeMatchAndUpdate(
    event: vscode.TextDocumentChangeEvent | vscode.TextEditor
  ) {
    const filePath = event.document.uri.fsPath;
    // Checks if code matches and re-renders panel
    if (fileBackupPath(filePath)) {
      const codeMatch = this._isCodeSameAsBackup();
      
      // If codeMatch status changed, update flag and refresh DocPanel:
      if (codeMatch !== this.codeMatchesBackup) {
        this.codeMatchesBackup = codeMatch;
        this.openDocPanel(
          this._quickstart.currentSection.title,
          this._quickstart.currentSection.docHTML()
        );
      }
    }
  }

  private _initializeRestoreCodeButtonListeners() {
    vscode.window.onDidChangeActiveTextEditor((event) => {
      if (event) {
        this.currentlyDisplayingDocument = event.document;
        this._checkCodeMatchAndUpdate(event);
      }
    });

    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.contentChanges.length !== 0) {
        this._checkCodeMatchAndUpdate(event);
      }
    });
  }

  private _isCodeSameAsBackup() {
    const activeCodePanel = vscode.window.activeTextEditor;
    if (!activeCodePanel) {
      return false;
    }

    const backupPath = fileBackupPath(activeCodePanel?.document.uri.fsPath);

    if (!backupPath) {
      return false;
    }

    const backupContents = readFileSync(backupPath, { encoding: "utf-8" });
    const workingFileContents = activeCodePanel.document.getText();

    return workingFileContents === backupContents;
  }

  private _generateHTML(docContent: string) {
    const webview = this.panel.webview;

    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "main.js")
    );

    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "vscode.css")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "main.css")
    );

    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "node_modules",
        "@vscode/codicons",
        "dist",
        "codicon.css"
      )
    );

    // check if doc content has images
    // if so, replace the image source with vscode URI
    docContent = docContent.replace(
      /<img\s+[^>]*src="([^"]*)"[^>]*>/g,
      (match, originalSrc) => {
        const onDiskPath = vscode.Uri.joinPath(
          this.context.extensionUri,
          originalSrc
        );
        const newSrc = this._panel?.webview.asWebviewUri(onDiskPath);
        return match.replace(/src="[^"]*"/, `src="${newSrc}"`);
      }
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    // for showing / hiding nav buttons
    const beginning =
      this._quickstart.currentSection.index === 0 && this._quickstart.currentSection.currentStep === 0;
    const end =
      this._quickstart.currentSection.index === this._quickstart.sections.length - 1 &&
      this._quickstart.currentSection.isDone();
    const latestSection = this._quickstart.currentSection.index === this._quickstart.latestSectionIndex;
    let nextArrow;
    // if (end || !this.currentSection.hasBeenDone()) {
    if (end) {
      // for develop only
      nextArrow = `<button class="arrow hide" id="next"><i class="codicon codicon-chevron-right"></i></button>`;
    } else if (latestSection) {
      nextArrow = `<button class="arrow" id="next">Next<i class="codicon codicon-chevron-right"></i></button>`;
    } else {
      nextArrow = `<button class="arrow secondary" id="next"><i class="codicon codicon-chevron-right"></i></button>`;
    }
    return /*html*/ `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">

    <!--
      Use a content security policy to only allow loading styles from our extension directory,
      and only allow scripts that have a specific nonce.
      (See the 'webview-sample' extension sample for img-src content security policy examples)
    -->
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${
      webview.cspSource
    }; style-src ${webview.cspSource}; font-src ${
      webview.cspSource
    }; script-src 'nonce-${nonce}';">
  
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleResetUri}" rel="stylesheet">
    <link href="${styleVSCodeUri}" rel="stylesheet">
    <link href="${styleMainUri}" rel="stylesheet">
    <link href="${codiconsUri}" rel="stylesheet" />
  
    <title>Quickstart Guide</title>
  </head>
  <body>
    <header class="action-buttons">
      <!-- edit text for development only -->
      <button class="secondary" id="edit-text">edit text</button>
      <button class="reset-code secondary ${
        this.codeMatchesBackup ? "hide" : ""
      }"><i class="codicon codicon-history"></i>reset code</button>
      <button class="run-code"><i class="codicon codicon-play"></i>run code</button>
    </header>
    <main>
      ${docContent}
      ${this._quickstart.currentSection.html()}
    </main>
    <footer class="navigation-buttons"> 
     <div id="progress-bar">
        <div id="progress" data-current="${
          this._quickstart.currentSection.index + 1
        }" data-end="${this._quickstart.sections.length}"></div>
        </div>
      <nav>
        <button class="arrow secondary ${
          beginning ? "hide" : ""
        }" id="previous"><i class="codicon codicon-chevron-left"></i></button>
        <p>Section ${this._quickstart.currentSection.index + 1} of ${
      this._quickstart.sections.length
    }</p>
          ${nextArrow}
      </nav> 
    </footer>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
    </html>`;
  }
}
