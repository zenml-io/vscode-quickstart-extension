import * as vscode from "vscode";
import path from "path";
import { readFileSync } from "fs";
import getNonce from "./utils/getNonce";
import fileHasBackup from "./utils/fileBackupPath";
import fileBackupPath from "./utils/fileBackupPath";
import codeRunner from "./utils/codeRunner";
import Quickstart from "./quickstart";

export default class QuickstartOrchestrator {
  private _currentlyDisplayingDocument: vscode.TextDocument | undefined;
  private _context: vscode.ExtensionContext;
  private _webviewFlags = { showResetCodeButton: false, alwaysShowNextButton: false, showEditTextButton: false}
  private _codePanel: vscode.TextEditor | undefined;
  private _webviewPanel: vscode.WebviewPanel | undefined;
  private _terminal: vscode.Terminal | undefined;
  private _quickstart: Quickstart;

  constructor(context: vscode.ExtensionContext, quickstart: Quickstart) {
    this._quickstart = quickstart;
    this._context = context;
    
    if (this._context.extensionMode === vscode.ExtensionMode.Production) {
      this._webviewFlags.alwaysShowNextButton = false;
      this._webviewFlags.showEditTextButton = false;
    }
  }

  public start() {
    this._closeSidebar();
    this._initializeRestoreCodeButtonListeners();
    this._closeAllTerminals();
    this._initializeQuickstartTerminalClosedListener();
    vscode.window
      .createTerminal({ hideFromUser: true })
      .sendText("zenml init && zenml stack set default");
    this.openSection(0);
  }

  // SETTERS AND GETTERS
  public set terminal(value: vscode.Terminal | undefined) {
    this._terminal = value;
  }

  public get terminal(): vscode.Terminal {
    if (this._terminal === undefined) {
      this._terminal = vscode.window.createTerminal("ZenML Terminal");
    }

    return this._terminal;
  }

  public get webviewPanel(): vscode.WebviewPanel {
    if (this._webviewPanel === undefined) {
      this._initializePanel();
    }

    return this._webviewPanel as vscode.WebviewPanel;
  }

  // QUICKSTART NAVIGATION
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
      this.closeCurrentCodePanel();
      await vscode.commands.executeCommand("vscode.setEditorLayout", {
        orientation: 0,
        groups: [{ groups: [{}], size: 1 }],
      });
    }

    this.openWebviewPanel(
      this._quickstart.currentSection.title,
      this._quickstart.currentSection.docHTML()
    );
  }

  openNextStep() {
    this._quickstart.currentSection.nextStep();
    this.openSection(this._quickstart.currentSection.index);
  }

  // TERMINAL
  public closeTerminal() {
    this.terminal?.hide();
  }

  sendTerminalCommand(command: string) {
    this.terminal.show(true);
    this.terminal.sendText(command);
  }

  async runCode(callback?: Function) {
    try {
      if (!this._codePanel) {
        throw new Error("Editor is not defined");
      }

      const activeEditorIsCurrentEditor =
        this._codePanel === vscode.window.activeTextEditor;

      if (!activeEditorIsCurrentEditor) {
        await vscode.window.showTextDocument(this._codePanel.document, {
          preview: true,
          preserveFocus: false,
          viewColumn: vscode.ViewColumn.Two,
        });
      }

      codeRunner(
        this.terminal,
        this._codePanel.document.uri,
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

  // PANELS

  openWebviewPanel(title: string, docContent: string) {
    if (!this._webviewPanel) {
      this._initializePanel();
    }

    // nullcheck to make typescript happy
    if (this._webviewPanel) {
      this._webviewPanel.title = title;
      this._webviewPanel.webview.html = this._generateHTML(docContent);
    }
  }

  async openCodePanel(codePath: string) {
    const onDiskPath = path.join(this._context.extensionPath, codePath);
    const filePath = vscode.Uri.file(onDiskPath);
    try {
      const document = await vscode.workspace.openTextDocument(filePath);
      this._currentlyDisplayingDocument = document;
      this._codePanel = await vscode.window.showTextDocument(
        document,
        vscode.ViewColumn.Two
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${error}`);
    }
  }

  closeCurrentCodePanel() {
    const currentEditor = this._codePanel?.document;
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

  async openEditPanel(codePath: string) {
    const onDiskPath = path.join(this._context.extensionPath, codePath);
    const filePath = vscode.Uri.file(onDiskPath);
    try {
      const document = await vscode.workspace.openTextDocument(filePath);
      this._currentlyDisplayingDocument = document;
      await vscode.window.showTextDocument(document, vscode.ViewColumn.Two);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${error}`);
    }
  }

  public async restoreCodeToBackup() {
    const activeCodePanelDocument = this._currentlyDisplayingDocument;
    if (!activeCodePanelDocument) {
      return;
    }

    await vscode.window.showTextDocument(activeCodePanelDocument, {
      preview: true,
      preserveFocus: false,
      viewColumn: vscode.ViewColumn.Two,
    });

    const activeEditor = vscode.window.activeTextEditor;

    // Guard against errors when file doesn't have backup or no activeEditor
    if (!fileHasBackup(activeCodePanelDocument.uri.fsPath) || !activeEditor) {
      return;
    }

    // Grab backup content path for current document to replace active document's content)
    const backupPath = activeCodePanelDocument.uri.fsPath.replace("sections", "sectionsBackup");

    //get the text from the backup
    const originalCode = readFileSync(backupPath, { encoding: "utf-8" });

    // A range that covers the entire document
    const documentRange = new vscode.Range(0, 0, activeCodePanelDocument.lineCount, Infinity);

    activeEditor.edit((editBuilder) => {
      editBuilder.replace(documentRange, originalCode);
    });

    activeEditor.document.save();
  }

  // INITIALIZERS
  private _initializePanel() {
    this._webviewPanel = vscode.window.createWebviewPanel(
      "zenml.markdown", // used internally - I think an identifier
      "Zenml", // displayed to user
      vscode.ViewColumn.One,
      {}
    );

    this._registerView();
    this._webviewPanel.onDidDispose(() => {
      this._webviewPanel = undefined;
    });
  }

  private _initializeRestoreCodeButtonListeners() {
    vscode.window.onDidChangeActiveTextEditor((event) => {
      if (event) {
        this._currentlyDisplayingDocument = event.document;
        this._checkCodeMatchAndUpdateWebview(event);
      }
    });

    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.contentChanges.length !== 0) {
        this._checkCodeMatchAndUpdateWebview(event);
      }
    });
  }

  // Updates the status of quickstart terminal if ZenML terminal 
  // instance gets disposed of
  private _initializeQuickstartTerminalClosedListener() {
    this._context.subscriptions.push(
      vscode.window.onDidCloseTerminal((closedTerminal) => {
        if (closedTerminal === this.terminal) {
          this.terminal = undefined;
        }
      })
    );
  }

  private _closeAllTerminals() {
     vscode.window.terminals.forEach((term) => term.dispose());
  }

  private _closeSidebar() {
    vscode.commands.executeCommand("workbench.view.explorer");
    vscode.commands.executeCommand("workbench.action.toggleSidebarVisibility");
  }

  // HELPERS
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

  private _checkCodeMatchAndUpdateWebview(
    event: vscode.TextDocumentChangeEvent | vscode.TextEditor
  ) {
    const filePath = event.document.uri.fsPath;
    // If backup exists, rerender Doc panel if necessary
    if (fileBackupPath(filePath)) {
      // Should show reset code button if current code does NOT match backup
      const shouldShowResetCodeButton = !this._isCodeSameAsBackup();
      
      // If code status changed, update flag and reopen Webview Panel:
      if (shouldShowResetCodeButton !== this._webviewFlags.showResetCodeButton) {
        this._webviewFlags.showResetCodeButton = shouldShowResetCodeButton;
        this.openWebviewPanel(
          this._quickstart.currentSection.title,
          this._quickstart.currentSection.docHTML()
        );
      }
    }
  }

  // WEBVIEW 
  private _registerView() {
    this.webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri],
    };

    this.webviewPanel.webview.onDidReceiveMessage(async (data) => {
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
          this.restoreCodeToBackup();
          break;
        }
        case "previous": {
          this.back();
          break;
        }
      }
    });
  }

  private _generateHTML(docContent: string) {
    const webview = this.webviewPanel.webview;
    

    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, "media", "main.js")
    );

    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, "media", "vscode.css")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, "media", "main.css")
    );

    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._context.extensionUri,
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
          this._context.extensionUri,
          originalSrc
        );
        const newSrc = this._webviewPanel?.webview.asWebviewUri(onDiskPath);
        return match.replace(/src="[^"]*"/, `src="${newSrc}"`);
      }
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    // for showing / hiding nav buttons
    const isBeginning =
      this._quickstart.currentSection.index === 0 && this._quickstart.currentSection.currentStep === 0;
    const isEnd =
      this._quickstart.currentSection.index === this._quickstart.sections.length - 1 &&
      this._quickstart.currentSection.isDone();
    const isLatestSection = this._quickstart.currentSection.index === this._quickstart.latestSectionIndex;
    
    let nextArrow;
    if ((isEnd || !this._quickstart.currentSection.hasBeenDone()) && !this._webviewFlags.alwaysShowNextButton) {
      // Hide the next arrow
      nextArrow = `<button class="arrow hide" id="next"><i class="codicon codicon-chevron-right"></i></button>`;
    } else if (isLatestSection) {
      // Show the next arrow as a primary button
      nextArrow = `<button class="arrow" id="next">Next<i class="codicon codicon-chevron-right"></i></button>`;
    } else {
      // Show the next arrow as a secondary button
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
      <button class="secondary ${this._webviewFlags.showEditTextButton ? "": "hide"}" id="edit-text">edit text</button>
      <button class="reset-code secondary ${
        this._webviewFlags.showResetCodeButton ? "" : "hide"
      }"><i class="codicon codicon-history"></i>reset code</button>
      <button class="run-code"><i class="codicon codicon-play"></i>run code</button>
    </header>
    <main>
      ${docContent}
    </main>
    <footer class="navigation-buttons"> 
     <div id="progress-bar">
        <div id="progress" data-current="${
          this._quickstart.currentSection.index + 1
        }" data-end="${this._quickstart.sections.length}"></div>
        </div>
      <nav>
        <button class="arrow secondary ${
          isBeginning ? "hide" : ""
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
