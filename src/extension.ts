// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import quickstartMetadata from "./quickstartMetadata.json";
import Quickstart from "./quickstart";
import setDirectory from "./utils/setExtensionDirectory";
import createSectionBackup from "./utils/createSectionBackup";
import getExtensionPath from "./utils/getDevContainerPath";

export async function activate(context: vscode.ExtensionContext) {
  const extensionPath = getExtensionPath(context);
  console.log("HELLO THIS IS HERE", extensionPath);
  // Only set the directory if running locally
  // if (!vscode.env.remoteName) {
  //   setDirectory(extensionPath);
  // }

  createSectionBackup(extensionPath);

  // close all terminals
  vscode.window.terminals.forEach((term) => term.dispose());

  // Open the sidebar so toggle will only close it
  vscode.commands.executeCommand("workbench.view.explorer");
  vscode.commands.executeCommand("workbench.action.toggleSidebarVisibility");

  const quickstart = new Quickstart(quickstartMetadata, context);

  // If a user closes the terminal the extension opened we set it
  // back to undefined so we know to open a new terminal
  context.subscriptions.push(
    vscode.window.onDidCloseTerminal((closedTerminal) => {
      if (closedTerminal === quickstart.terminal) {
        quickstart.terminal = undefined;
      }
    })
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
