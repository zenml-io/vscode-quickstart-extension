import { cp } from "node:fs/promises";
import * as vscode from "vscode";

export default async function createSectionBackup(quickstartUri: vscode.Uri) {
  const quickstartPath = quickstartUri.fsPath;
  try {
    await cp(`${quickstartPath}/sections`, `${quickstartPath}/sectionsBackup`, {
      recursive: true,
      force: false,
    });
  } catch (error) {
    console.error("Failed to create backup:", error);
  }
}
