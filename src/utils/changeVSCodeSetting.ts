import * as vscode from "vscode";

export default function changeVSCodeSetting(
  settingName: string,
  newValue: string
) {
  // Get the workspace configuration
  const config = vscode.workspace.getConfiguration();

  // Update the setting
  config.update(settingName, newValue, vscode.ConfigurationTarget.Global).then(
    () => {
      vscode.window.showInformationMessage(
        `Setting "${settingName}" updated to ${newValue}`
      );
    },
    (err) => {
      vscode.window.showErrorMessage(`Failed to update setting: ${err}`);
    }
  );
}
