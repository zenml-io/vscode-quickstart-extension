import * as vscode from "vscode";

export default function getDevContainerPath(context: vscode.ExtensionContext) {
  // this works for the vscode-quickstart but breaks for local development
  return "/workspaces/vscode-quickstart/.devcontainer";
  // if (context.extensionMode === vscode.ExtensionMode.Production) {
  //   return "/workspaces/vscode-quickstart/.devcontainer";
  // } else {
  //   return "/workspaces/vscode-quickstart-extension/.devcontainer";
  // }
}
