import * as vscode from 'vscode';

export class WaitDetector {
  private disposables: vscode.Disposable[] = [];
  private onWaitStart: (taskName: string) => void;
  private onWaitEnd: () => void;

  constructor(
    onWaitStart: (taskName: string) => void,
    onWaitEnd: () => void,
  ) {
    this.onWaitStart = onWaitStart;
    this.onWaitEnd = onWaitEnd;

    this.disposables.push(
      vscode.tasks.onDidStartTask((e) => {
        this.onWaitStart(e.execution.task.name);
      })
    );

    this.disposables.push(
      vscode.tasks.onDidEndTask(() => {
        this.onWaitEnd();
      })
    );
  }

  dispose() {
    this.disposables.forEach(d => d.dispose());
  }
}
