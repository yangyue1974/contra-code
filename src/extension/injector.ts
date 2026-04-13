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
    const backupPath = htmlPath + '.contra-backup';
    let content = fs.readFileSync(htmlPath, 'utf-8');

    // Save backup of original (only if no backup exists yet)
    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, content, 'utf-8');
    }

    // Remove old injection if exists
    if (content.includes(INJECT_MARKER_START)) {
      content = removeInjection(content);
    }

    // Read the overlay script
    const scriptPath = path.join(extensionPath, 'dist', 'overlay', 'inject.js');
    const scriptContent = fs.readFileSync(scriptPath, 'utf-8');

    // Remove Trusted Types CSP that blocks inline scripts
    content = content.replace(/require-trusted-types-for[^;]*;/g, '');
    content = content.replace(/trusted-types[^"]*;/g, '');

    // Inject after the last </script> tag (after workbench.js loads)
    const injection = `\n${INJECT_MARKER_START}\n<script>\n${scriptContent}\n</script>\n${INJECT_MARKER_END}`;
    const lastScriptClose = content.lastIndexOf('</script>');
    if (lastScriptClose !== -1) {
      const insertPos = lastScriptClose + '</script>'.length;
      content = content.substring(0, insertPos) + injection + content.substring(insertPos);
    } else {
      content = content.replace('</html>', `${injection}\n</html>`);
    }

    fs.writeFileSync(htmlPath, content, 'utf-8');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export function uninjectOverlay(): { success: boolean; error?: string } {
  try {
    const htmlPath = getWorkbenchHtmlPath();
    const backupPath = htmlPath + '.contra-backup';

    // Restore from backup if available (cleanest approach)
    if (fs.existsSync(backupPath)) {
      const original = fs.readFileSync(backupPath, 'utf-8');
      fs.writeFileSync(htmlPath, original, 'utf-8');
      fs.unlinkSync(backupPath);
      return { success: true };
    }

    // Fallback: manual removal
    let content = fs.readFileSync(htmlPath, 'utf-8');
    if (!content.includes(INJECT_MARKER_START)) {
      return { success: true };
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
