import * as vscode from 'vscode';
import { GamePanel } from './gamePanel';
import { StatusBar } from './statusBar';
import { WaitDetector } from './waitDetector';
import { getConfig } from './config';

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

  context.subscriptions.push(startCmd, stopCmd, leaderboardCmd, statusBar);

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
