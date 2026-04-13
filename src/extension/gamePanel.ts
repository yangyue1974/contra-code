import * as vscode from 'vscode';

export class GamePanel {
  private static instance: GamePanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    this.panel.webview.html = this.getHtml();

    this.panel.onDidDispose(() => {
      GamePanel.instance = undefined;
    });
  }

  static createOrShow(context: vscode.ExtensionContext) {
    if (GamePanel.instance) {
      GamePanel.instance.panel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'contraCode',
      'Contra Code',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview'),
        ],
      }
    );

    GamePanel.instance = new GamePanel(panel, context.extensionUri);
  }

  static dispose() {
    if (GamePanel.instance) {
      GamePanel.instance.panel.dispose();
      GamePanel.instance = undefined;
    }
  }

  private getHtml(): string {
    const scriptUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'main.js')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contra Code</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #0a0a0a; }
    canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated; }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
