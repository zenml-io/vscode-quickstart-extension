import { cp } from "node:fs/promises";

export default async function createSectionBackup(quickstartPath: string) {
  try {
    await cp(`${quickstartPath}/zenmlQuickstart/sections`, `${quickstartPath}/zenmlQuickstart/sectionsBackup`, {
      recursive: true,
      force: false,
    });
  } catch (error) {
    console.error("Failed to create backup:", error);
  }
}
