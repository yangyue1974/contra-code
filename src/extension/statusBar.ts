import * as vscode from 'vscode';

export class StatusBar {
  private item: vscode.StatusBarItem;
  private gameActive = false;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'contraCode.focusGame';
    this.item.text = '$(game) Contra Code';
    this.item.show();
  }

  showWaitingPrompt(taskName: string) {
    this.item.text = `$(game) ${taskName}... Play a round?`;
    this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }

  clearWaitingPrompt() {
    this.item.text = '$(game) Contra Code';
    this.item.backgroundColor = undefined;
  }

  dispose() {
    this.item.dispose();
  }
}
