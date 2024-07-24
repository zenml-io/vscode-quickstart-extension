import { existsSync } from "fs";

export default function fileBackupPath(filePath: string) {
  const backupPath = filePath.replace("/sections/", "/sectionsBackup/");

  if (backupPath.includes("/sectionsBackup/") && existsSync(backupPath)) {
    return backupPath;
  } else {
    return undefined;
  }
}
