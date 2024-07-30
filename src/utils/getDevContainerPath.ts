import * as vscode from "vscode";

export default function getDevContainerPath(context: vscode.ExtensionContext) {
  if (context.extensionMode === vscode.ExtensionMode.Production) {
    return "/workspaces/vscode-quickstart/.devcontainer";
  } else {
    return "/workspaces/vscode-quickstart-extension/.devcontainer";
  }
}
