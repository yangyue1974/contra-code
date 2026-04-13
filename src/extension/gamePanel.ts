import * as vscode from 'vscode';
import { getConfig } from './config';

type DisposeCallback = () => void;

export class GamePanel {
  private static instance: GamePanel | undefined;
  private static disposeCallbacks: DisposeCallback[] = [];
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    this.panel.webview.html = this.getHtml();

    this.panel.onDidDispose(() => {
      GamePanel.instance = undefined;
      GamePanel.disposeCallbacks.forEach(cb => cb());
    });

    // Send initial config after a short delay to ensure webview is ready
    const config = getConfig();
    setTimeout(() => {
      this.panel.webview.postMessage({
        type: 'setNickname',
        nickname: config.nickname || 'Anonymous',
      });
      this.panel.webview.postMessage({
        type: 'setAudioConfig',
        enabled: config.audioEnabled,
        musicVolume: config.musicVolume,
        sfxVolume: config.sfxVolume,
      });
    }, 500);
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
          vscode.Uri.joinPath(context.extensionUri, 'media'),
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

  static sendMessage(message: any) {
    GamePanel.instance?.panel.webview.postMessage(message);
  }

  static onDispose(callback: DisposeCallback) {
    GamePanel.disposeCallbacks.push(callback);
  }

  private getHtml(): string {
    const scriptUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'main.js')
    );
    const bgmUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'bgm.mp3')
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
  <canvas id="game" tabindex="0"></canvas>
  <script>
    window.__BGM_URL__ = "${bgmUri}";
    const c = document.getElementById('game');
    c.focus();
    c.addEventListener('click', () => c.focus());
    window.addEventListener('keydown', (e) => {
      const gameKeys = ['KeyW','KeyA','KeyS','KeyD','KeyZ','KeyJ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter','Escape'];
      if (gameKeys.includes(e.code)) {
        e.stopPropagation();
      }
    }, true);
  </script>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
