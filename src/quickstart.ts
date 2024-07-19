import * as vscode from "vscode";
import path from "path";
import generateHTMLfromMD from "./utils/generateHTMLfromMD";
import getNonce from "./utils/getNonce";
import { writeFileSync, readFileSync, read } from "fs";
import os from "os";

interface TutorialData {
  sections: Section[];
}

interface SectionStep {
  doc: string;
  docHTML?: string;
  code: string;
  html?: string;
}

interface Section {
  title: string;
  description: string;
  steps: SectionStep[];
}

class QuickstartSection {
  public title: string;
  public context: vscode.ExtensionContext;
  public description: string;
  public currentStep: number;
  private _steps: SectionStep[];
  private _done = false;

  constructor(section: Section, context: vscode.ExtensionContext) {
    this.context = context;
    this.title = section.title;
    this.description = section.description;
    this._steps = section.steps;
    this._convertStepMarkdown();
    this.currentStep = 0;
    return this;
  }

  nextStep() {
    if (this.currentStep + 1 < this._steps.length) {
      this.currentStep++;
    }
    if (this.currentStep >= this._steps.length - 1) {
      this._done = true;
    }
  }

  doc() {
    return this._steps[this.currentStep].doc;
  }

  docHTML() {
    const html = this._steps[this.currentStep].docHTML;

    return html ? html : "";
  }

  code() {
    return this._steps[this.currentStep].code;
  }

  html() {
    const file = this._steps[this.currentStep].html;

    if (file) {
      const htmlPath = path.join(this.context.extensionPath, file);
      const htmlContent = readFileSync(htmlPath, { encoding: "utf-8" });

      return htmlContent;
    } else {
      return "";
    }
  }

  reset() {
    this.currentStep = 0;
    this._done = false;
  }

  isDone() {
    return this._done;
  }

  private _convertStepMarkdown() {
    this._steps.forEach((step) => {
      const tutorialPath = path.join(this.context.extensionPath, step.doc);
      step.docHTML = generateHTMLfromMD(tutorialPath);
    });
  }
}

export default class Quickstart {
  public metadata: TutorialData;
  public editor: vscode.TextEditor | undefined;
  public panel: vscode.WebviewPanel | undefined;
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
  }

  public set terminal(value: vscode.Terminal | undefined) {
    this._terminal = value;
  }

  public closeTerminal() {
    this._terminal?.hide();
  }

  public get terminal(): vscode.Terminal {
    if (this._terminal === undefined) {
      this._terminal = vscode.window.createTerminal("ZenML Terminal");
    }

    return this._terminal;
  }

  public resetCode() {
    if (!this.editor) {
      return;
    }
    //get the current open section
    const openCode = this.currentSection.code();
    //replace the path to point to the backup
    const backupPath =
      this.context.extensionPath +
      "/" +
      openCode.replace("sections", "sectionsBackup");
    console.log(backupPath);

    //get the text from the backup
    const originalCode = readFileSync(backupPath, { encoding: "utf-8" });

    // A range that covers the entire document
    const documentRange = new vscode.Range(
      0,
      0,
      this.editor.document.lineCount,
      Infinity
    );

    this.editor.edit((editBuilder) => {
      editBuilder.replace(documentRange, originalCode);
    });

    this.editor.document.save();
  }

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
          viewColumn: vscode.ViewColumn.One,
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
    if (!this.panel) {
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
        const newSrc = this.panel?.webview.asWebviewUri(onDiskPath);
        return match.replace(/src="[^"]*"/, `src="${newSrc}"`);
      }
    );

    // nullcheck to make typescript happy
    if (this.panel) {
      this.panel.title = title;
      this.panel.webview.html = docContent;
    }
  }

  async openCodePanel(codePath: string) {
    const onDiskPath = path.join(this.context.extensionPath, codePath);
    const filePath = vscode.Uri.file(onDiskPath);
    try {
      const document = await vscode.workspace.openTextDocument(filePath);
      this.editor = await vscode.window.showTextDocument(
        document,
        vscode.ViewColumn.One
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
    this.panel = vscode.window.createWebviewPanel(
      "zenml.markdown", // used internally - I think an identifier
      "Zenml", // displayed to user
      vscode.ViewColumn.Two,
      {}
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
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
        if (onSuccessCallback) onSuccessCallback();
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
}
