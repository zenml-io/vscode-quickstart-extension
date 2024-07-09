// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import quickstartMetadata from "./quickstart-metadata.json";
import Quickstart from "./Quickstart";
import ZenmlViewProvider from "./ZenmlViewProvider";

export async function activate(context: vscode.ExtensionContext) {
  const quickstart = new Quickstart(quickstartMetadata, context);
  const provider = new ZenmlViewProvider(context.extensionUri, quickstart);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ZenmlViewProvider.viewId,
      provider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("zenml.openDocPanel", (fileId: number) => {
      quickstart.onOpenDocPanel(fileId);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "zenml.openCodePanel",
      async (fileId: number) => {
        await quickstart.onOpenCodePanel(fileId);
      }
    )
  );

  // If a user closes the terminal the extension opened we set it back to undefined so we know to open a new terminal
  context.subscriptions.push(
    vscode.window.onDidCloseTerminal((closedTerminal) => {
      if (closedTerminal === quickstart.terminal) {
        quickstart.terminal = undefined;
      }
    })
  );

  // Runs the first open text editor with node - Creates a terminal if there isn't one already
  context.subscriptions.push(
    vscode.commands.registerCommand("zenml.runCurrentPythonFile", async () => {
      quickstart.onRunCodeFile();
    })
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
