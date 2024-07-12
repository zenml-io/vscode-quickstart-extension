// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import quickstartMetadata from "./quickstart-metadata.json";
import Quickstart from "./Quickstart";
import ZenmlViewProvider from "./ZenmlViewProvider";

export async function activate(context: vscode.ExtensionContext) {
  // set terminal starting directory (CWD)
  // changeVSCodeSetting("terminal.integrated.cwd", "/home/codespace/.vscode-remote/extensions/zenml.zenml-vscode-quickstart-0.0.1/media/zenml");
  // @ts-ignore
  const quickstart = new Quickstart(quickstartMetadata, context);
  const provider = new ZenmlViewProvider(context.extensionUri, quickstart);

  // Register webview
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ZenmlViewProvider.viewId,
      provider
    )
  );

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


function changeVSCodeSetting(settingName: string, newValue: string) {
  // Get the workspace configuration
  const config = vscode.workspace.getConfiguration();

  // Update the setting
  config.update(settingName, newValue, vscode.ConfigurationTarget.Global)
    .then(() => {
      vscode.window.showInformationMessage(`Setting "${settingName}" updated to ${newValue}`);
    }, (err) => {
      vscode.window.showErrorMessage(`Failed to update setting: ${err}`);
    });
}

// This method is called when your extension is deactivated
export function deactivate() { }
