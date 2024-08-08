// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import quickstartMetadata from "./quickstartMetadata.json";
import QuickstartOrchestrator from "./quickstartOrchestrator";
import setDirectory from "./utils/setExtensionDirectory";
import createSectionBackup from "./utils/createSectionBackup";
import getExtensionUri from "./utils/getExtensionUri";
import Quickstart from "./quickstart";

export async function activate(context: vscode.ExtensionContext) {
  const extensionUri = getExtensionUri(context);
  // Only set the directory if running in devcontainer
  if (vscode.env.remoteName) {
    setDirectory(extensionUri);
  }

  createSectionBackup(extensionUri);

  // close all terminals
  vscode.window.terminals.forEach((term) => term.dispose());

  // Open the sidebar so toggle will only close it
  // vscode.commands.executeCommand("workbench.view.explorer");
  // vscode.commands.executeCommand("workbench.action.toggleSidebarVisibility");

  const quickstart = new Quickstart(quickstartMetadata, context);
  const orchestrator = new QuickstartOrchestrator(context, quickstart);
  orchestrator.start();

}

// This method is called when your extension is deactivated
export function deactivate() {}
