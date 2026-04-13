import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const INJECT_MARKER_START = '<!-- CONTRA_CODE_START -->';
const INJECT_MARKER_END = '<!-- CONTRA_CODE_END -->';

function getWorkbenchHtmlPath(): string {
  const appRoot = vscode.env.appRoot;
  return path.join(appRoot, 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html');
}

export function isInjected(): boolean {
  try {
    const htmlPath = getWorkbenchHtmlPath();
    const content = fs.readFileSync(htmlPath, 'utf-8');
    return content.includes(INJECT_MARKER_START);
  } catch {
    return false;
  }
}

export function injectOverlay(extensionPath: string): { success: boolean; error?: string } {
  try {
    const htmlPath = getWorkbenchHtmlPath();
    let content = fs.readFileSync(htmlPath, 'utf-8');

    // Remove old injection if exists
    if (content.includes(INJECT_MARKER_START)) {
      content = removeInjection(content);
    }

    // Read the overlay script
    const scriptPath = path.join(extensionPath, 'dist', 'overlay', 'inject.js');
    const scriptContent = fs.readFileSync(scriptPath, 'utf-8');

    // Inject before </body>
    const injection = `${INJECT_MARKER_START}\n<script>\n${scriptContent}\n</script>\n${INJECT_MARKER_END}`;
    content = content.replace('</body>', `${injection}\n</body>`);

    fs.writeFileSync(htmlPath, content, 'utf-8');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export function uninjectOverlay(): { success: boolean; error?: string } {
  try {
    const htmlPath = getWorkbenchHtmlPath();
    let content = fs.readFileSync(htmlPath, 'utf-8');

    if (!content.includes(INJECT_MARKER_START)) {
      return { success: true }; // nothing to remove
    }

    content = removeInjection(content);
    fs.writeFileSync(htmlPath, content, 'utf-8');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

function removeInjection(content: string): string {
  const startIdx = content.indexOf(INJECT_MARKER_START);
  const endIdx = content.indexOf(INJECT_MARKER_END);
  if (startIdx === -1 || endIdx === -1) return content;
  return content.substring(0, startIdx) + content.substring(endIdx + INJECT_MARKER_END.length + 1);
}
