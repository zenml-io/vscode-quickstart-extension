import * as vscode from "vscode";
import getNonce from "./getNonce";
import { writeFileSync, unlinkSync } from "fs";
import path from "path";
import os from "os";

export default function codeRunner(
  terminal: vscode.Terminal,
  fileUri: vscode.Uri,
  onSuccessCallback?: Function,
  onErrorCallback?: Function
) {
  const uniqueId = getNonce();

  const { successFilePath, errorFilePath } = initializeFileWatcher(
    fileUri.fsPath,
    uniqueId,
    onSuccessCallback,
    onErrorCallback
  );

  runCode(terminal, fileUri.fsPath, uniqueId, successFilePath, errorFilePath);
}

function runCode(
  terminal: vscode.Terminal,
  filePath: string,
  uniqueId: string,
  successFilePath: string,
  errorFilePath: string
) {
  const scriptPath = path.join(os.tmpdir(), `runCode${uniqueId}.sh`);

  writeFileSync(
    scriptPath,
    `
    {
    clear
    echo "Executing code..."
    python "${filePath}"
    if [ $? -eq 0 ]; then
      touch "${successFilePath}"
    else
      touch "${errorFilePath}"
    fi
    exit
    }
    `
  );

  terminal.sendText(`bash ${scriptPath}`);
}

function initializeFileWatcher(
  filePath: string,
  uniqueId: string,
  onSuccessCallback?: Function,
  onFailureCallback?: Function
) {
  const removeLastFileFromPath = (filePath: string) => {
    let sections = filePath.split("/");
    sections.pop();
    return sections.join("/") + "/";
  };

  const successFileName = `runSuccess${uniqueId}.txt`;
  const errorFileName = `runError${uniqueId}.txt`;
  const scriptPath = path.join(os.tmpdir(), `runCode${uniqueId}.sh`);

  const pathWithoutEndFile = removeLastFileFromPath(filePath);
  const successFilePath = `${pathWithoutEndFile}${successFileName}`;
  const errorFilePath = `${pathWithoutEndFile}${errorFileName}`;

  // File System watcher for signal files
  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(pathWithoutEndFile, "*.txt")
  );

  // Logic to run once a signal file is created
  watcher.onDidCreate((uri) => {
    if (uri.fsPath.endsWith(successFileName)) {
      vscode.workspace.fs.delete(uri);
      unlinkSync(scriptPath);
      watcher.dispose();
      if (onSuccessCallback) {
        onSuccessCallback();
      }

    } else if (uri.fsPath.endsWith(errorFileName)) {
      vscode.workspace.fs.delete(uri);
      unlinkSync(scriptPath);
      watcher.dispose();

      if (onFailureCallback) {
        onFailureCallback();
      }
    }
  });

  // Return paths for both success and error signal files for external use
  return { successFilePath, errorFilePath };
}
