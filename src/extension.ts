import * as vscode from "vscode";
import quickstartMetadata from "./quickstartMetadata.json";
import Quickstart from "./quickstart";
import createSectionBackup from "./utils/createSectionBackup";
import getDevContainerPath from "./utils/getDevContainerPath";

export async function activate(context: vscode.ExtensionContext) {
  createSectionBackup(getDevContainerPath(context));

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
