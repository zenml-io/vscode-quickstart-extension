import { existsSync } from "fs";

export default function fileHasBackup(filePath: string) {
  const backupPath = filePath.replace("/sections/", "/sectionsBackup/");

  return backupPath.includes("/sectionsBackup/") && existsSync(backupPath);
}
