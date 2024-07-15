import changeVSCodeSetting from "./changeVSCodeSetting";
import * as vscode from "vscode";

export function setCWD() {
  const isCodespace = process.env.CODESPACES === "true";
  vscode.window.showInformationMessage(
    `codespace env variable = ${process.env.CODESPACES}`
  );

  changeVSCodeSetting(
    "terminal.integrated.cwd",
    `/home/codespace/${
      isCodespace ? ".vscode-remote" : ".vscode-server"
    }/extensions/zenml.zenml-vscode-quickstart-0.0.1/zenmlQuickstart/sections`
  );
}

export function unsetCWD() {
  changeVSCodeSetting("terminal.integrated.cwd", "");
}
