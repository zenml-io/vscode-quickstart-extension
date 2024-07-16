import * as vscode from "vscode";

export default async function setDirectory() {
  const isCodespace = process.env.CODESPACES === "true";

  const targetUri = vscode.Uri.file(
    `/home/codespace/${
      isCodespace ? ".vscode-remote" : ".vscode-server"
    }/extensions/zenml.zenml-vscode-quickstart-0.0.1/zenmlQuickstart/sections`
  );

  const currentWorkspace = vscode.workspace.workspaceFolders;

  if (
    !currentWorkspace ||
    currentWorkspace[0].uri.fsPath !== targetUri.fsPath
  ) {
    try {
      await vscode.commands.executeCommand("vscode.openFolder", targetUri);
    } catch (e) {
      vscode.window.showErrorMessage(
        `There was a problem opening the directory: ${e}`
      );
    }
  }
}
