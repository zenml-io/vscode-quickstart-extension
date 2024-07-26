import { marked } from "marked";
import { readFileSync } from "fs";

export default function generateHTMLfromMD(filePath: string) {
  const tutorialMarkdown = readFileSync(filePath, { encoding: "utf-8" });
  // marked will return a string unless set up to use async option
  return marked(tutorialMarkdown) as string;
}
