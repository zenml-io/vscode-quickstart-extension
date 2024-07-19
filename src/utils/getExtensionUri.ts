import * as vscode from "vscode";

export default function getExtensionUri(context: vscode.ExtensionContext) {
  if (context.extensionMode === vscode.ExtensionMode.Production) {
    const isCodespace = process.env.CODESPACES === "true";

    return vscode.Uri.file(
      `/root/${
        isCodespace ? ".vscode-remote" : ".vscode-server"
      }/extensions/zenml.zenml-vscode-quickstart-0.0.1/zenmlQuickstart/sections`
    );
  } else {
    return vscode.Uri.file(
      "/workspaces/vscode-quickstart-extension/zenmlQuickstart/sections"
    );
  }
}
