import * as vscode from "vscode";

export default async function setDirectory(quickStartUri: vscode.Uri) {
  const targetUri = quickStartUri.with({
    path: `${quickStartUri.fsPath}/sections`,
  });

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
