import * as vscode from "vscode";
import { readFileSync } from "fs";
import generateHTMLfromMD from "./utils/generateHTMLfromMD";
import path from "path";

export interface TutorialData {
  sections: Section[];
}

interface SectionStep {
  doc: string;
  docHTML?: string;
  code?: string;
  html?: string;
}

export interface Section {
  title: string;
  description: string;
  steps: SectionStep[];
}

export class QuickstartSection {
  public title: string;
  public context: vscode.ExtensionContext;
  public description: string;
  public currentStep: number;
  private _steps: SectionStep[];
  private _done = false;
  private _hasBeenDone = false;

  constructor(section: Section, context: vscode.ExtensionContext) {
    this.context = context;
    this.title = section.title;
    this.description = section.description;
    this._steps = section.steps;
    this._convertStepMarkdown();
    this.currentStep = 0;
    if (this.currentStep === this._steps.length - 1) {
      this._done = true;
    }
    return this;
  }

  nextStep() {
    if (this.currentStep + 1 < this._steps.length) {
      this.currentStep++;
    }
    if (this.currentStep >= this._steps.length - 1) {
      this._done = true;
      this._hasBeenDone = true;
    }
  }

  previousStep() {
    if (this.currentStep - 1 >= 0) {
      this.currentStep--;
      this._done = false;
    }
  }

  doc() {
    return this._steps[this.currentStep].doc;
  }

  docHTML() {
    const html = this._steps[this.currentStep].docHTML;

    return html ? html : "";
  }

  code() {
    return this._steps[this.currentStep].code;
  }

  html() {
    const file = this._steps[this.currentStep].html;

    if (file) {
      const htmlPath = path.join(this.context.extensionPath, file);
      const htmlContent = readFileSync(htmlPath, { encoding: "utf-8" });

      return htmlContent;
    } else {
      return "";
    }
  }

  reset() {
    this.currentStep = 0;
    this._done = false;
  }

  isDone() {
    return this._done;
  }

  hasBeenDone() {
    return this._hasBeenDone;
  }

  private _convertStepMarkdown() {
    this._steps.forEach((step) => {
      const tutorialPath = path.join(this.context.extensionPath, step.doc);
      step.docHTML = generateHTMLfromMD(tutorialPath);
    });
  }
}
