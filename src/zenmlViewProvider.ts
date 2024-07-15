import * as vscode from "vscode";
import Quickstart from "./quickstart";
import getNonce from "./utils/getNonce";

// Responsible for displaying Quickstart Steps
// Also responsible for changing the VSCode UI based on received messages from main.js
export default class ZenmlViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = "zenml.stepsView";

  private _view?: vscode.WebviewView;
  private _quickstart;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    quickstart: Quickstart
  ) {
    this._quickstart = quickstart;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "openSection": {
          this._quickstart.openSection(data.id);
          break;
        }
        case "runCodeFile": {
          this._quickstart.runCode();
          break;
        }
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.js")
    );

    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.css")
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
				<html lang="en">
				<head>
					<meta charset="UTF-8">
	
					<!--
						Use a content security policy to only allow loading styles from our extension directory,
						and only allow scripts that have a specific nonce.
						(See the 'webview-sample' extension sample for img-src content security policy examples)
					-->
					<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
	
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="${styleResetUri}" rel="stylesheet">
          <link href="${styleVSCodeUri}" rel="stylesheet">
          <link href="${styleMainUri}" rel="stylesheet">
	
					<title>Quickstart Guide</title>
				</head>
				<body>
        
          <button class="accordion section" data-id="0">Welcome</button>
          <div class="panel">
            <p>Welcome! This is some text over here</p>
            <button class="run-code">Execute Current Code</button>
          </div>
          <hr>
          <button class="accordion section" data-id="1">Section 2</button>
          <div class="panel">
            <p>This is some text for section two</p>
            <input type="text"></input>
            <button class="run-code">Execute Current Code</button>
          </div>	
           <hr>
          <button class="accordion section" data-id="2">Section 2</button>
          <div class="panel">
            <p>This is some text for section three</p>
            <button class="run-code">Execute Current Code</button>
          </div>	
					<script nonce="${nonce}" src="${scriptUri}"></script>
				</body>
				</html>`;
  }
}