import * as vscode from 'vscode';
import { GamePanel } from './gamePanel';
import { StatusBar } from './statusBar';
import { WaitDetector } from './waitDetector';
import { getConfig } from './config';
import { injectOverlay, uninjectOverlay, isInjected } from './injector';

let statusBar: StatusBar;

export function activate(context: vscode.ExtensionContext) {
  statusBar = new StatusBar();

  const startCmd = vscode.commands.registerCommand('contraCode.startGame', () => {
    if (!getConfig().enabled) {
      vscode.window.showInformationMessage('Contra Code is disabled. Enable it in settings.');
      return;
    }
    GamePanel.createOrShow(context);
    statusBar.setGameActive(true);
  });

  const stopCmd = vscode.commands.registerCommand('contraCode.stopGame', () => {
    GamePanel.dispose();
    statusBar.setGameActive(false);
  });

  const leaderboardCmd = vscode.commands.registerCommand('contraCode.showLeaderboard', () => {
    GamePanel.createOrShow(context);
    GamePanel.sendMessage({ type: 'showLeaderboard' });
  });

  const enableOverlayCmd = vscode.commands.registerCommand('contraCode.enableOverlay', () => {
    const result = injectOverlay(context.extensionPath);
    if (result.success) {
      vscode.window.showInformationMessage(
        'Contra Code overlay enabled! Restart VS Code to activate. Use Ctrl+Shift+G to play. You may see a "corrupt installation" warning — this is normal and safe to dismiss.',
        'Restart Now'
      ).then(choice => {
        if (choice === 'Restart Now') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      });
    } else {
      vscode.window.showErrorMessage(`Failed to enable overlay: ${result.error}. Try running VS Code as admin.`);
    }
  });

  const disableOverlayCmd = vscode.commands.registerCommand('contraCode.disableOverlay', () => {
    const result = uninjectOverlay();
    if (result.success) {
      vscode.window.showInformationMessage(
        'Contra Code overlay disabled. Restart VS Code to take effect.',
        'Restart Now'
      ).then(choice => {
        if (choice === 'Restart Now') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      });
    } else {
      vscode.window.showErrorMessage(`Failed to disable overlay: ${result.error}`);
    }
  });

  context.subscriptions.push(startCmd, stopCmd, leaderboardCmd, enableOverlayCmd, disableOverlayCmd, statusBar);

  GamePanel.onDispose(() => {
    statusBar.setGameActive(false);
  });

  // Wait-state detection
  if (getConfig().smartDetection) {
    const waitDetector = new WaitDetector(
      (taskName) => statusBar.showWaitingPrompt(taskName),
      () => statusBar.clearWaitingPrompt(),
    );
    context.subscriptions.push(waitDetector);
  }
}

export function deactivate() {
  GamePanel.dispose();
  statusBar?.dispose();
}
