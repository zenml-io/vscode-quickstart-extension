import * as vscode from "vscode";
import path from "path";
import getNonce from "./utils/getNonce";
import { writeFileSync, readFileSync } from "fs";
import os from "os";
import QuickstartSection from "./quickstartSection";
import { TutorialData } from "./quickstartSection";
import fileHasBackup from "./utils/fileBackupPath";
import fileBackupPath from "./utils/fileBackupPath";

export default class Quickstart {
  public metadata: TutorialData;
  public editor: vscode.TextEditor | undefined;
  public currentlyDisplayingDocument: vscode.TextDocument | undefined;
  public _panel: vscode.WebviewPanel | undefined;
  public sections: QuickstartSection[];
  public context: vscode.ExtensionContext;
  public currentSectionIndex = 0;
  public currentSection: QuickstartSection;
  public codeMatchesBackup: boolean = true;
  private _terminal: vscode.Terminal | undefined;
  private _latestSectionIdx = 0;

  constructor(metadata: TutorialData, context: vscode.ExtensionContext) {
    this.metadata = metadata;
    this.sections = this.metadata.sections.map((section) => {
      return new QuickstartSection(section, context);
    });
    this._codeModifiedListener();
    this._activeTextEditorListener();
    this.context = context;
    this.currentSection = this.sections[0];
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

    //replace the path to point to the backup
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
    if (this.currentSection.currentStep === 0) {
      this.openSection(--this.currentSectionIndex);
    } else {
      this.currentSection.previousStep();
      this.openSection(this.currentSectionIndex);
    }
  }
  // Doc Panel
  async openSection(sectionId: number) {
    this._setSection(sectionId);

    if (sectionId > this._latestSectionIdx) {
      this._latestSectionIdx = sectionId;
    }

    const openCode = this.currentSection.code();

    if (!openCode) {
      this.closeCurrentEditor();
      await vscode.commands.executeCommand("vscode.setEditorLayout", {
        orientation: 0,
        groups: [{ groups: [{}], size: 1 }],
      });

      this.openDocPanel(
        this.currentSection.title,
        this.currentSection.docHTML()
      );
      return;
    }

    await vscode.commands.executeCommand("vscode.setEditorLayout", {
      orientation: 0,
      groups: [
        { groups: [{}], size: 0.5 },
        { groups: [{}], size: 0.5 },
      ],
    });

    this.openCodePanel(openCode);
    this.openDocPanel(this.currentSection.title, this.currentSection.docHTML());
  }

  openNextStep() {
    this.currentSection.nextStep();
    this.openSection(this.currentSectionIndex);
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

      const filePath: string = this.editor.document.uri.fsPath;

      // watcher to automatically run next step when current file runs
      const { successFilePath, errorFilePath } = this._initializeFileWatcher(
        filePath,
        callback
      );
      this._runCode(filePath, successFilePath, errorFilePath);

      this.terminal.show(true);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to execute file: ${error}`);
    }
  }

  // package code into a bash script so user doesn't see watcher logic
  private _runCode(
    filePath: string,
    successFilePath: string,
    errorFilePath: string
  ) {
    const scriptPath = path.join(os.tmpdir(), "runCode.sh");

    writeFileSync(
      scriptPath,
      `
    clear
    echo "Executing code..."
    python "${filePath}"
    if [ $? -eq 0 ]; then
      touch "${successFilePath}"
    else
      touch "${errorFilePath}"
    fi
    `
    );

    this.sendTerminalCommand(`bash ${scriptPath}`);
  }

  // HELPERS

  openDocPanel(title: string, docContent: string) {
    if (!this._panel) {
      this._initializePanel();
    }

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

  private _setSection(index: number) {
    if (index > -1 && index < this.sections.length) {
      this.currentSectionIndex = index;
      this.currentSection = this.sections[index];
    } else {
      throw new Error("Invalid Index");
    }
  }

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

  // Watcher is created in the same directory as the file being executed
  // So we're taking in the path to the file being executed and manipulating it
  // to get the directory
  private _initializeFileWatcher(path: string, onSuccessCallback?: Function) {
    const removeLastFileFromPath = (filePath: string) => {
      let sections = filePath.split("/");
      sections.pop();
      return sections.join("/") + "/";
    };

    const uniqueNumber = getNonce();
    const successFileName = `runSuccess${uniqueNumber}.txt`;
    const errorFileName = `runError${uniqueNumber}.txt`;

    const pathWithoutEndFile = removeLastFileFromPath(path);
    const successFilePath = `${pathWithoutEndFile}${successFileName}`;
    const errorFilePath = `${pathWithoutEndFile}${errorFileName}`;

    // File System watcher for signal files
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(pathWithoutEndFile, "*.txt")
    );

    // Logic to run once a signal file is created
    watcher.onDidCreate((uri) => {
      if (uri.fsPath.endsWith(successFileName)) {
        vscode.window.showInformationMessage("Code Ran Successfully! 🎉");
        if (onSuccessCallback) {
          onSuccessCallback();
        }
        this.openNextStep();
      } else if (uri.fsPath.endsWith(errorFileName)) {
        vscode.window.showErrorMessage("Code Run Encountered an Error. ❌");
      }

      // Delete the signal file and dispose the watcher
      vscode.workspace.fs.delete(uri);
      watcher.dispose();
    });

    // Return paths for both success and error signal files for external use
    return { successFilePath, errorFilePath };
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
          this.openEditPanel(this.currentSection.doc());
          break;
        }
        case "serverConnect": {
          this.sendTerminalCommand(`zenml connect --url "${data.url}"`);
          break;
        }
        case "nextStep": {
          this.currentSection.nextStep();
          this.openSection(this.currentSectionIndex);
          break;
        }
        case "next": {
          if (this.currentSection.isDone()) {
            this.openSection(this.currentSectionIndex + 1);
            this.closeTerminal();
          } else {
            this.currentSection.nextStep();
            this.openSection(this.currentSectionIndex);
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

  private _activeTextEditorListener() {
    vscode.window.onDidChangeActiveTextEditor((event) => {
      this.currentlyDisplayingDocument = event
        ? event.document
        : this.currentlyDisplayingDocument;
      if (event) {
        this._changeEventHandle(event);
      }
    });
  }

  private _codeModifiedListener() {
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.contentChanges.length === 0) {
        return;
      }
      this._changeEventHandle(event);
    });
  }

  private _changeEventHandle(
    event: vscode.TextDocumentChangeEvent | vscode.TextEditor
  ) {
    const filePath = event.document.uri.fsPath;
    if (!fileBackupPath(filePath)) {
      // Guard against files without backup
      this.codeMatchesBackup = true;
      this.openDocPanel(
        this.currentSection.title,
        this.currentSection.docHTML()
      );
    } else {
      // Checks if code matches and re-renders panel
      const codeMatch = this._codeEqualsBackup();
      if (codeMatch !== this.codeMatchesBackup) {
        this.codeMatchesBackup = codeMatch;
        this.openDocPanel(
          this.currentSection.title,
          this.currentSection.docHTML()
        );
      }
    }
  }

  private _codeEqualsBackup() {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return false;
    }

    const backupPath = fileBackupPath(activeEditor?.document.uri.fsPath);

    if (!backupPath) {
      return false;
    }

    const originalContents = readFileSync(backupPath, { encoding: "utf-8" });
    const workingFileContents = activeEditor.document.getText();

    return workingFileContents === originalContents;
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

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    // for showing / hiding nav buttons
    const beginning =
      this.currentSectionIndex === 0 && this.currentSection.currentStep === 0;
    const end =
      this.currentSectionIndex === this.sections.length - 1 &&
      this.currentSection.isDone();
    const latestSection = this.currentSectionIndex === this._latestSectionIdx;

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
    <header>
      <button class="secondary" id="edit-text">edit text</button>
      <button class="reset-code secondary ${
        this.codeMatchesBackup ? "hide" : ""
      }"><i class="codicon codicon-history"></i>reset code</button>
      <button class="run-code"><i class="codicon codicon-play"></i>run code</button>
    </header>
    <main>
      ${docContent}
      ${this.currentSection.html()}
    </main>
    <footer>  
      <div id="progress-bar">
        <div id="progress" data-current="${
          this.currentSectionIndex + 1
        }" data-end="${this.sections.length}"></div>
      </div>
      <nav>
        <button class="arrow secondary ${
          beginning ? "hide" : ""
        }" id="previous"><i class="codicon codicon-chevron-left"></i></button>
        <p>Section ${this.currentSectionIndex + 1} of ${
      this.sections.length
    }</p>
        <button class="arrow ${latestSection ? "": "secondary"} ${
          end || !this.currentSection.hasBeenDone() ? "hide" : ""
        }" id="next"><i class="codicon codicon-chevron-right"></i></button>
      </nav>
    </footer>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
    </html>`;
  }
}
