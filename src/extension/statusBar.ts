import * as vscode from 'vscode';

export class StatusBar {
  private item: vscode.StatusBarItem;
  private gameActive = false;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'contraCode.startGame';
    this.updateDisplay();
    this.item.show();
  }

  setGameActive(active: boolean) {
    this.gameActive = active;
    this.updateDisplay();
  }

  showWaitingPrompt(taskName: string) {
    this.item.text = `$(game) ${taskName}... Play a round?`;
    this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }

  clearWaitingPrompt() {
    this.updateDisplay();
    this.item.backgroundColor = undefined;
  }

  private updateDisplay() {
    if (this.gameActive) {
      this.item.text = '$(game) Contra Code [Playing]';
      this.item.command = 'contraCode.stopGame';
    } else {
      this.item.text = '$(game) Contra Code';
      this.item.command = 'contraCode.startGame';
    }
  }

  dispose() {
    this.item.dispose();
  }
}
