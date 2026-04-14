import * as vscode from 'vscode';
import { getConfig } from './config';

export class GamePanelViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'contraCode.gameView';
  private view?: vscode.WebviewView;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview'),
        vscode.Uri.joinPath(this.extensionUri, 'media'),
      ],
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    // Stop music when panel becomes hidden (user switches tab or hides panel)
    webviewView.onDidChangeVisibility(() => {
      if (!webviewView.visible) {
        webviewView.webview.postMessage({ type: 'stopMusic' });
      } else {
        webviewView.webview.postMessage({ type: 'resumeMusic' });
      }
    });

    // Send config once webview is ready
    const config = getConfig();
    setTimeout(() => {
      webviewView.webview.postMessage({
        type: 'setNickname',
        nickname: config.nickname || 'Anonymous',
      });
      webviewView.webview.postMessage({
        type: 'setAudioConfig',
        enabled: config.audioEnabled,
        musicVolume: config.musicVolume,
        sfxVolume: config.sfxVolume,
      });
    }, 500);
  }

  public sendMessage(message: any) {
    this.view?.webview.postMessage(message);
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'main.js')
    );
    const bgmUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'bgm.mp3')
    );
    const spriteBase = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'sprites')
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
    canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated; outline: none; }
  </style>
</head>
<body>
  <canvas id="game" tabindex="0"></canvas>
  <script>
    window.__BGM_URL__ = "${bgmUri}";
    window.__SPRITE_BASE__ = "${spriteBase}";
    // Ensure canvas captures keyboard focus
    const c = document.getElementById('game');
    c.focus();
    c.addEventListener('click', () => c.focus());
    // Prevent default browser behavior for game keys (but don't stop propagation — game needs the events)
    window.addEventListener('keydown', (e) => {
      const gameKeys = ['KeyW','KeyA','KeyS','KeyD','KeyZ','KeyJ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter','Escape'];
      if (gameKeys.includes(e.code)) {
        e.preventDefault();
      }
    });
  </script>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
