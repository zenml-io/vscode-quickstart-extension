import * as vscode from "vscode";
import path from "path";
import generateHTMLfromMD from "./utils/generateHTMLfromMD";
import getNonce from "./utils/getNonce";
import { writeFileSync } from "fs";
import os from "os";

interface TutorialData {
  sections: Section[];
}

interface SectionStep {
  doc: string;
  code: string;
}

interface Section {
  title: string;
  description: string;
  steps: SectionStep[];
}

class QuickstartSection {
  title: string;
  description: string;
  _steps: SectionStep[];
  currentStep: number;
  private _done = false;

  constructor(section: Section) {
    this.title = section.title;
    this.description = section.description;
    this._steps = section.steps;
    this.currentStep = 0;
    return this;
  }

  nextStep() {
    if (this.currentStep + 1 < this._steps.length) {
      this.currentStep++;
    } else {
      this._done = true;
    }
  }

  doc() {
    return this._steps[this.currentStep].doc;
  }

  code() {
    return this._steps[this.currentStep].code;
  }

  reset() {
    this.currentStep = 0;
  }

  done?() {
    return this._done;
  }
}

export default class Quickstart {
  public metadata: TutorialData;
  public terminal: vscode.Terminal | undefined;
  public editor: vscode.TextEditor | undefined;
  public panel: vscode.WebviewPanel | undefined;
  public sections: QuickstartSection[];
  public context: vscode.ExtensionContext;
  public currentSectionIndex = 0;

  constructor(metadata: TutorialData, context: vscode.ExtensionContext) {
    this.metadata = metadata;
    this.sections = this.metadata.sections.map((section) => {
      return new QuickstartSection(section);
    });
    this.context = context;
  }

  async openSection(sectionId: number) {
    this.currentSectionIndex = sectionId; // set current step to opened section -- should probbaly include some verification that that step exists first
    const currentSection = this.sections[this.currentSectionIndex];

    await vscode.commands.executeCommand("vscode.setEditorLayout", {
      orientation: 0,
      groups: [
        { groups: [{}], size: 0.5 },
        { groups: [{}], size: 0.5 },
      ],
    });

    this.openCodePanel(currentSection.code());
    this.openDocPanel(currentSection.title, currentSection.doc());
  }

  openNextStep() {
    const currentSection = this.sections[this.currentSectionIndex];
    currentSection.nextStep();

    this.openSection(this.currentSectionIndex);
  }

  runCode() {
    try {
      const activeEditorIsCurrentEditor =
        this.editor === vscode.window.activeTextEditor;

      if (!this.editor || !activeEditorIsCurrentEditor) {
        throw new Error("File has to be open and visible to execute");
      }

      if (!this.terminal) {
        this.terminal = vscode.window.createTerminal("ZenML Terminal");
      }

      const filePath: string = this.editor.document.uri.fsPath;
      const signalFilePath = this._initializeFileWatcher(filePath); // To automatically run

      this._runCode(filePath, signalFilePath);

      this.terminal.show();
    } catch (error) {
      vscode.window.showErrorMessage(`File has to be open to execute.`);
    }
  }

  private _runCode(filePath: string, signalFilePath: string) {
    if (!this.terminal) {
      this.terminal = vscode.window.createTerminal("ZenML Terminal");
    }

    const scriptPath = path.join(os.tmpdir(), "runCode.sh");

    writeFileSync(
      scriptPath,
      `
    python "${filePath}"
    touch "${signalFilePath}"
    `
    );

    this.terminal.sendText(`bash ${scriptPath}`);
  }

  // HELPERS

  openDocPanel(title: string, docPath: string) {
    if (!this.panel) {
      this._initializePanel();
    }

    const tutorialPath = path.join(this.context.extensionPath, docPath);

    // nullcheck to make typescript happy
    if (this.panel) {
      this.panel.title = title;
      this.panel.webview.html = generateHTMLfromMD(tutorialPath);
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
  private _initializeFileWatcher(path: string) {
    const removeLastFileFromPath = (filePath: string) => {
      let sections = filePath.split("/");
      sections.pop();
      return sections.join("/") + "/";
    };

    const uniqueNumber = getNonce();
    const signalFileName = `runcomplete${uniqueNumber}.txt`;
    const pathWithoutEndFile = removeLastFileFromPath(path);
    const signalFilePath = `${pathWithoutEndFile}${signalFileName}`;

    // File System watcher for signal file
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(pathWithoutEndFile, "*.txt")
    );

    // Logic to run once the signal file is created, includes disposing watcher
    watcher.onDidCreate(() => {
      vscode.window.showInformationMessage("Code Run Successfully! 🎉");
      vscode.workspace.fs.delete(vscode.Uri.file(signalFilePath));
      this.openNextStep();
      watcher.dispose();
    });

    return signalFilePath;
  }
}