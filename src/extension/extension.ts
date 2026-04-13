import * as vscode from 'vscode';
import { GamePanel } from './gamePanel';

export function activate(context: vscode.ExtensionContext) {
  const startCmd = vscode.commands.registerCommand('contraCode.startGame', () => {
    GamePanel.createOrShow(context);
  });

  const stopCmd = vscode.commands.registerCommand('contraCode.stopGame', () => {
    GamePanel.dispose();
  });

  context.subscriptions.push(startCmd, stopCmd);
}

export function deactivate() {
  GamePanel.dispose();
}
