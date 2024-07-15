import * as vscode from "vscode";

export default async function setDirectory() {
  const isCodespace = process.env.CODESPACES === "true";

  const uri = vscode.Uri.file(
    `/home/codespace/${
      isCodespace ? ".vscode-remote" : ".vscode-server"
    }/extensions/zenml.zenml-vscode-quickstart-0.0.1/zenmlQuickstart/sections`
  );

  try {
    await vscode.commands.executeCommand("vscode.openFolder", uri);
  } catch (e) {
    vscode.window.showErrorMessage(
      `There was a problem opening the directory: ${e}`
    );
  }
}
