import * as vscode from "vscode";
import path from "path";
import getNonce from "./utils/getNonce";
import { writeFileSync } from "fs";
import os from "os";
import QuickstartSection from "./quickstartSection";
import { TutorialData } from "./quickstartSection";

export default class Quickstart {
  public metadata: TutorialData;
  public editor: vscode.TextEditor | undefined;
  public _panel: vscode.WebviewPanel | undefined;
  public sections: QuickstartSection[];
  public context: vscode.ExtensionContext;
  public currentSectionIndex = 0;
  public currentSection: QuickstartSection;
  private _terminal: vscode.Terminal | undefined;

  constructor(metadata: TutorialData, context: vscode.ExtensionContext) {
    this.metadata = metadata;
    this.sections = this.metadata.sections.map((section) => {
      return new QuickstartSection(section, context);
    });
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

  // Doc Panel
  async openSection(sectionId: number) {
    this._setSection(sectionId);

    await vscode.commands.executeCommand("vscode.setEditorLayout", {
      orientation: 0,
      groups: [
        { groups: [{}], size: 0.5 },
        { groups: [{}], size: 0.5 },
      ],
    });

    this.openCodePanel(this.currentSection.code());
    this.openDocPanel(this.currentSection.title, this.currentSection.docHTML());
  }

  openNextStep() {
    this.currentSection.nextStep();
    this.openSection(this.currentSectionIndex);
  }

  // Terminal
  public closeTerminal() {
    this._terminal?.hide();
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
          preview: false,
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
      this.editor = await vscode.window.showTextDocument(
        document,
        vscode.ViewColumn.Two
      );
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
        this.openNextStep();
        if (onSuccessCallback) {
          onSuccessCallback();
        }
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
          console.log("Code File");
          await this.runCode();
          break;
        }
        case "resetSection": {
          this.currentSection.reset();
          this.openSection(this.currentSectionIndex);
          this.closeTerminal();
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
      }
    });
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

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

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
    }; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleResetUri}" rel="stylesheet">
    <link href="${styleVSCodeUri}" rel="stylesheet">
    <link href="${styleMainUri}" rel="stylesheet">
  
    <title>Quickstart Guide</title>
  </head>
  
  <body>
    ${docContent}
    ${this.currentSection.html()}
    <button class="run-code">Execute Current Code</button>
    <button class="reset-section">Reset Section</button>
    <button class="next-step ${
      this.currentSection.isDone() ? "hide" : ""
    }" >Next Step</button>
    <button class="next-section ${
      this.currentSection.isDone() ? "" : "hide"
    }" data-id="${this.currentSectionIndex + 1}">Go to next section</button>
    <footer>  
      <p>Section ${this.currentSectionIndex + 1} of ${this.sections.length}</p>
    </footer>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
    </html>`;
  }
}
