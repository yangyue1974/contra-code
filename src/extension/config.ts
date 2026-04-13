import * as vscode from 'vscode';

export function getConfig() {
  const config = vscode.workspace.getConfiguration('contraCode');
  return {
    enabled: config.get<boolean>('enabled', true),
    smartDetection: config.get<boolean>('smartDetection', true),
    audioEnabled: config.get<boolean>('audioEnabled', true),
    musicVolume: config.get<number>('musicVolume', 0.5),
    sfxVolume: config.get<number>('sfxVolume', 0.7),
    nickname: config.get<string>('nickname', ''),
  };
}
