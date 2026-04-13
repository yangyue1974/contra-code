# Contra Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a VS Code extension that overlays a Contra-inspired pixel-art infinite runner/shooter game on the editor, with global leaderboard support.

**Architecture:** VS Code extension hosts a Webview panel containing an HTML5 Canvas 2D game engine. The extension host manages lifecycle, commands, status bar, wait-state detection, and focus switching. The webview runs the game loop, rendering, physics, and Supabase leaderboard API calls. Two separate TypeScript compilation targets (Node.js for extension, browser for webview) bundled with esbuild.

**Tech Stack:** TypeScript, VS Code Extension API, HTML5 Canvas 2D, Web Audio API, Supabase (PostgreSQL + REST API), esbuild, Vitest

**Design Spec:** `docs/superpowers/specs/2026-04-13-contra-code-design.md`

---

## Important Note: Overlay Limitation

VS Code's Webview API does not support true transparent overlays on top of the editor content. A `WebviewPanel` is an editor tab — it replaces the editor view, not floats above it. For v1, the game opens as a full-screen editor tab with a dark themed background. Users can use VS Code's split editor (`Ctrl+\`) to view code alongside the game. The visual design should still use the semi-transparent/glow aesthetic described in the spec to maintain the intended atmosphere. A future version could explore Electron BrowserWindow injection for true overlay support.

---

## File Structure

```
contra-code/
├── package.json                          # Extension manifest + dependencies
├── tsconfig.json                         # Extension TypeScript config (Node.js)
├── tsconfig.webview.json                 # Webview TypeScript config (browser)
├── esbuild.mjs                           # Build script (two entry points)
├── vitest.config.ts                      # Test configuration
├── .vscodeignore                         # Marketplace packaging exclusions
├── .gitignore
├── media/
│   └── icon.png                          # Extension icon (placeholder)
├── src/
│   ├── extension/
│   │   ├── extension.ts                  # activate() / deactivate()
│   │   ├── gamePanel.ts                  # WebviewPanel creation & messaging
│   │   ├── statusBar.ts                  # Status bar button management
│   │   ├── waitDetector.ts               # Terminal/task wait-state detection
│   │   └── config.ts                     # Read VS Code settings
│   └── webview/
│       ├── index.html                    # HTML shell with canvas
│       ├── main.ts                       # Webview entry point
│       ├── engine/
│       │   ├── Game.ts                   # Game class: loop, state, init
│       │   ├── Input.ts                  # Keyboard state tracking
│       │   ├── Camera.ts                 # Auto-scrolling viewport
│       │   ├── Physics.ts                # Gravity, AABB collision
│       │   └── Renderer.ts              # Canvas draw helpers, sprite blitting
│       ├── entities/
│       │   ├── Entity.ts                 # Base entity (pos, size, velocity, health)
│       │   ├── Player.ts                 # Player: movement, jump, aim, shoot
│       │   ├── Bullet.ts                 # Bullet: direction, speed, owner
│       │   ├── Soldier.ts                # Ground enemy: walks toward player
│       │   ├── Flyer.ts                  # Air enemy: sine-wave movement
│       │   ├── Turret.ts                 # Stationary enemy: periodic firing
│       │   └── Boss.ts                   # Boss: health bar, attack patterns
│       ├── world/
│       │   ├── Terrain.ts                # Procedural platform/gap generation
│       │   └── Spawner.ts                # Enemy wave spawning by score
│       ├── systems/
│       │   ├── Collision.ts              # Collision detection & resolution
│       │   └── Score.ts                  # Score tracking, combo multiplier
│       ├── ui/
│       │   ├── HUD.ts                    # In-game score/combo display
│       │   ├── DeathScreen.ts            # Death overlay, restart, submit score
│       │   └── LeaderboardUI.ts          # Top scores display
│       ├── audio/
│       │   └── AudioManager.ts           # Web Audio API: music + SFX
│       ├── network/
│       │   └── LeaderboardAPI.ts         # Supabase REST calls
│       └── sprites/
│           └── SpriteData.ts             # Pixel art as 2D color arrays
├── test/
│   ├── engine/
│   │   ├── Input.test.ts
│   │   ├── Camera.test.ts
│   │   └── Physics.test.ts
│   ├── entities/
│   │   ├── Player.test.ts
│   │   ├── Bullet.test.ts
│   │   └── enemies.test.ts
│   ├── world/
│   │   ├── Terrain.test.ts
│   │   └── Spawner.test.ts
│   ├── systems/
│   │   ├── Collision.test.ts
│   │   └── Score.test.ts
│   └── network/
│       └── LeaderboardAPI.test.ts
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-04-13-contra-code-design.md
        └── plans/
            └── 2026-04-13-contra-code.md  # This file
```

---

## Phase 1: Foundation

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.webview.json`
- Create: `esbuild.mjs`
- Create: `vitest.config.ts`
- Create: `.vscodeignore`
- Create: `.gitignore`

- [ ] **Step 1: Initialize project and install dependencies**

```bash
cd /Users/yangyue12/Documents/Products/Game
npm init -y
npm install --save-dev typescript esbuild @types/vscode vitest @vitest/coverage-v8
```

- [ ] **Step 2: Create package.json with extension manifest**

Replace the generated `package.json` with the full VS Code extension manifest:

```json
{
  "name": "contra-code",
  "displayName": "Contra Code",
  "description": "Kill time between builds — Contra-style. A pixel-art run-and-gun game overlay for VS Code.",
  "version": "0.1.0",
  "publisher": "contra-code",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Other"],
  "activationEvents": ["onStartupFinished"],
  "main": "./dist/extension/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "contraCode.startGame",
        "title": "Contra Code: Start Game"
      },
      {
        "command": "contraCode.stopGame",
        "title": "Contra Code: Stop Game"
      },
      {
        "command": "contraCode.showLeaderboard",
        "title": "Contra Code: Show Leaderboard"
      }
    ],
    "configuration": {
      "title": "Contra Code",
      "properties": {
        "contraCode.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable/disable the game"
        },
        "contraCode.smartDetection": {
          "type": "boolean",
          "default": true,
          "description": "Show notification when builds/tests are running"
        },
        "contraCode.audioEnabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable game audio"
        },
        "contraCode.musicVolume": {
          "type": "number",
          "default": 0.5,
          "minimum": 0,
          "maximum": 1,
          "description": "Background music volume"
        },
        "contraCode.sfxVolume": {
          "type": "number",
          "default": 0.7,
          "minimum": 0,
          "maximum": 1,
          "description": "Sound effects volume"
        },
        "contraCode.nickname": {
          "type": "string",
          "default": "",
          "maxLength": 20,
          "description": "Nickname for the leaderboard"
        }
      }
    }
  },
  "scripts": {
    "build": "node esbuild.mjs",
    "watch": "node esbuild.mjs --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "package": "vsce package"
  },
  "devDependencies": {}
}
```

- [ ] **Step 3: Create TypeScript configs**

`tsconfig.json` (extension — Node.js target):

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "lib": ["ES2022"],
    "outDir": "dist/extension",
    "rootDir": "src/extension",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "declaration": true
  },
  "include": ["src/extension/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`tsconfig.webview.json` (webview — browser target):

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "outDir": "dist/webview",
    "rootDir": "src/webview",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "moduleResolution": "bundler"
  },
  "include": ["src/webview/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create esbuild script**

`esbuild.mjs`:

```javascript
import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const extensionConfig = {
  entryPoints: ['src/extension/extension.ts'],
  bundle: true,
  outfile: 'dist/extension/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  sourcemap: true,
  target: 'node18',
};

const webviewConfig = {
  entryPoints: ['src/webview/main.ts'],
  bundle: true,
  outfile: 'dist/webview/main.js',
  format: 'iife',
  platform: 'browser',
  sourcemap: true,
  target: 'chrome110',
};

if (isWatch) {
  const extCtx = await esbuild.context(extensionConfig);
  const webCtx = await esbuild.context(webviewConfig);
  await Promise.all([extCtx.watch(), webCtx.watch()]);
  console.log('Watching for changes...');
} else {
  await Promise.all([
    esbuild.build(extensionConfig),
    esbuild.build(webviewConfig),
  ]);
  console.log('Build complete.');
}
```

- [ ] **Step 5: Create vitest config**

`vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 6: Create .vscodeignore and .gitignore**

`.vscodeignore`:

```
src/**
test/**
node_modules/**
.gitignore
tsconfig*.json
esbuild.mjs
vitest.config.ts
docs/**
```

`.gitignore`:

```
node_modules/
dist/
*.vsix
.superpowers/
```

- [ ] **Step 7: Commit**

```bash
git init
git add package.json tsconfig.json tsconfig.webview.json esbuild.mjs vitest.config.ts .vscodeignore .gitignore
git commit -m "feat: project scaffold with build system"
```

---

### Task 2: Extension Host + Webview Panel

**Files:**
- Create: `src/extension/extension.ts`
- Create: `src/extension/gamePanel.ts`
- Create: `src/webview/index.html`
- Create: `src/webview/main.ts`

- [ ] **Step 1: Create extension entry point**

`src/extension/extension.ts`:

```typescript
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
```

- [ ] **Step 2: Create Webview panel manager**

`src/extension/gamePanel.ts`:

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class GamePanel {
  private static instance: GamePanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private disposed = false;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    this.panel.webview.html = this.getHtml();

    this.panel.onDidDispose(() => {
      this.disposed = true;
      GamePanel.instance = undefined;
    });
  }

  static createOrShow(context: vscode.ExtensionContext) {
    if (GamePanel.instance) {
      GamePanel.instance.panel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'contraCode',
      'Contra Code',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview'),
        ],
      }
    );

    GamePanel.instance = new GamePanel(panel, context.extensionUri);
  }

  static dispose() {
    if (GamePanel.instance) {
      GamePanel.instance.panel.dispose();
      GamePanel.instance = undefined;
    }
  }

  private getHtml(): string {
    const scriptUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'main.js')
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
    canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated; }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
```

- [ ] **Step 3: Create webview entry point**

`src/webview/main.ts`:

```typescript
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resize();
window.addEventListener('resize', resize);

// Placeholder: draw a test screen to verify webview works
ctx.fillStyle = '#0a0a0a';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#00ff00';
ctx.font = '24px monospace';
ctx.textAlign = 'center';
ctx.fillText('Contra Code — Ready', canvas.width / 2, canvas.height / 2);
```

- [ ] **Step 4: Build and test manually**

```bash
npm run build
```

Then press F5 in VS Code to launch the Extension Development Host. Run "Contra Code: Start Game" from the command palette. Verify a dark panel opens with green "Contra Code — Ready" text.

- [ ] **Step 5: Commit**

```bash
git add src/extension/ src/webview/
git commit -m "feat: extension host and webview panel with canvas"
```

---

### Task 3: Game Loop + Input System

**Files:**
- Create: `src/webview/engine/Game.ts`
- Create: `src/webview/engine/Input.ts`
- Create: `test/engine/Input.test.ts`

- [ ] **Step 1: Write Input tests**

`test/engine/Input.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Input } from '../../src/webview/engine/Input';

describe('Input', () => {
  let input: Input;

  beforeEach(() => {
    input = new Input();
  });

  it('tracks key down state', () => {
    input.handleKeyDown('ArrowLeft');
    expect(input.isDown('ArrowLeft')).toBe(true);
  });

  it('tracks key up state', () => {
    input.handleKeyDown('ArrowLeft');
    input.handleKeyUp('ArrowLeft');
    expect(input.isDown('ArrowLeft')).toBe(false);
  });

  it('reports no keys pressed initially', () => {
    expect(input.isDown('ArrowLeft')).toBe(false);
    expect(input.isDown('Space')).toBe(false);
  });

  it('tracks multiple simultaneous keys', () => {
    input.handleKeyDown('ArrowUp');
    input.handleKeyDown('ArrowRight');
    input.handleKeyDown('KeyZ');
    expect(input.isDown('ArrowUp')).toBe(true);
    expect(input.isDown('ArrowRight')).toBe(true);
    expect(input.isDown('KeyZ')).toBe(true);
  });

  it('detects just-pressed via justPressed()', () => {
    input.handleKeyDown('Space');
    expect(input.justPressed('Space')).toBe(true);
    input.endFrame();
    expect(input.justPressed('Space')).toBe(false);
    expect(input.isDown('Space')).toBe(true);
  });

  it('resets all state on reset()', () => {
    input.handleKeyDown('ArrowLeft');
    input.reset();
    expect(input.isDown('ArrowLeft')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run test/engine/Input.test.ts
```

Expected: FAIL — `Cannot find module '../../src/webview/engine/Input'`

- [ ] **Step 3: Implement Input**

`src/webview/engine/Input.ts`:

```typescript
export class Input {
  private keys = new Set<string>();
  private justPressedKeys = new Set<string>();

  handleKeyDown(code: string) {
    if (!this.keys.has(code)) {
      this.justPressedKeys.add(code);
    }
    this.keys.add(code);
  }

  handleKeyUp(code: string) {
    this.keys.delete(code);
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  justPressed(code: string): boolean {
    return this.justPressedKeys.has(code);
  }

  endFrame() {
    this.justPressedKeys.clear();
  }

  reset() {
    this.keys.clear();
    this.justPressedKeys.clear();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run test/engine/Input.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Create Game class**

`src/webview/engine/Game.ts`:

```typescript
import { Input } from './Input';

export type GameState = 'title' | 'playing' | 'dead';

export class Game {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly input = new Input();

  state: GameState = 'title';
  private lastTime = 0;
  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    window.addEventListener('keydown', (e) => {
      e.preventDefault();
      this.input.handleKeyDown(e.code);
    });
    window.addEventListener('keyup', (e) => {
      e.preventDefault();
      this.input.handleKeyUp(e.code);
    });
  }

  start() {
    this.state = 'playing';
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  stop() {
    this.running = false;
  }

  private loop(time: number) {
    if (!this.running) return;

    const dt = Math.min((time - this.lastTime) / 1000, 0.05); // cap at 50ms
    this.lastTime = time;

    this.update(dt);
    this.render();
    this.input.endFrame();

    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number) {
    // Will be filled in by subsequent tasks
  }

  private render() {
    const { ctx, canvas } = this;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Placeholder: show state
    ctx.fillStyle = '#00ff00';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`State: ${this.state}`, 10, 24);
    ctx.fillText('Press Space to start', 10, 48);
  }
}
```

- [ ] **Step 6: Wire Game into main.ts**

Replace `src/webview/main.ts`:

```typescript
import { Game } from './engine/Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resize();
window.addEventListener('resize', resize);

const game = new Game(canvas);
game.start();
```

- [ ] **Step 7: Build and test manually**

```bash
npm run build
```

F5 → "Contra Code: Start Game". Verify green text "State: playing" appears and updates.

- [ ] **Step 8: Commit**

```bash
git add src/webview/engine/ test/engine/ src/webview/main.ts
git commit -m "feat: game loop and input system with tests"
```

---

## Phase 2: Core Gameplay

### Task 4: Entity Base + Player Character

**Files:**
- Create: `src/webview/entities/Entity.ts`
- Create: `src/webview/entities/Player.ts`
- Create: `src/webview/engine/Camera.ts`
- Create: `test/entities/Player.test.ts`
- Create: `test/engine/Camera.test.ts`

- [ ] **Step 1: Write Player tests**

`test/entities/Player.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../src/webview/entities/Player';
import { Input } from '../../src/webview/engine/Input';

describe('Player', () => {
  let player: Player;
  let input: Input;

  beforeEach(() => {
    input = new Input();
    player = new Player(100, 300, input);
  });

  it('initializes at given position', () => {
    expect(player.x).toBe(100);
    expect(player.y).toBe(300);
  });

  it('moves left when left key is pressed', () => {
    input.handleKeyDown('ArrowLeft');
    player.update(1 / 60);
    expect(player.x).toBeLessThan(100);
  });

  it('does not move right from right key alone (auto-scroll)', () => {
    const startX = player.x;
    input.handleKeyDown('ArrowRight');
    player.update(1 / 60);
    expect(player.x).toBe(startX);
  });

  it('jumps when space is pressed and on ground', () => {
    player.onGround = true;
    input.handleKeyDown('Space');
    player.update(1 / 60);
    expect(player.vy).toBeLessThan(0); // negative = upward
  });

  it('does not jump in air (no double jump initially)', () => {
    player.onGround = false;
    player.jumpsRemaining = 0;
    input.handleKeyDown('Space');
    player.update(1 / 60);
    expect(player.vy).toBe(0);
  });

  it('supports double jump', () => {
    player.onGround = false;
    player.jumpsRemaining = 1;
    input.handleKeyDown('Space');
    player.update(1 / 60);
    expect(player.vy).toBeLessThan(0);
    expect(player.jumpsRemaining).toBe(0);
  });

  it('crouches when down is pressed', () => {
    player.onGround = true;
    input.handleKeyDown('ArrowDown');
    player.update(1 / 60);
    expect(player.crouching).toBe(true);
  });

  it('aims based on direction keys', () => {
    input.handleKeyDown('ArrowUp');
    input.handleKeyDown('ArrowRight');
    player.update(1 / 60);
    expect(player.aimAngle).toBeCloseTo(-Math.PI / 4); // upper-right
  });

  it('aims straight up when only up is pressed', () => {
    input.handleKeyDown('ArrowUp');
    player.update(1 / 60);
    expect(player.aimAngle).toBeCloseTo(-Math.PI / 2);
  });

  it('aims forward by default', () => {
    player.update(1 / 60);
    expect(player.aimAngle).toBe(0); // right
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run test/entities/Player.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement Entity base class**

`src/webview/entities/Entity.ts`:

```typescript
export class Entity {
  x: number;
  y: number;
  width: number;
  height: number;
  vx = 0;
  vy = 0;
  alive = true;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  get left() { return this.x; }
  get right() { return this.x + this.width; }
  get top() { return this.y; }
  get bottom() { return this.y + this.height; }
  get centerX() { return this.x + this.width / 2; }
  get centerY() { return this.y + this.height / 2; }
}
```

- [ ] **Step 4: Implement Player**

`src/webview/entities/Player.ts`:

```typescript
import { Entity } from './Entity';
import { Input } from '../engine/Input';

const MOVE_SPEED = 200; // pixels per second
const JUMP_VELOCITY = -400;
const MAX_JUMPS = 2;

export class Player extends Entity {
  private input: Input;
  onGround = false;
  crouching = false;
  jumpsRemaining = MAX_JUMPS;
  aimAngle = 0; // radians, 0 = right
  facingRight = true;

  constructor(x: number, y: number, input: Input) {
    super(x, y, 24, 32);
    this.input = input;
  }

  update(dt: number) {
    // Horizontal movement — left only (right is auto-scroll)
    if (this.input.isDown('ArrowLeft') || this.input.isDown('KeyA')) {
      this.vx = -MOVE_SPEED;
      this.facingRight = false;
    } else {
      this.vx = 0;
      if (!this.input.isDown('ArrowRight') && !this.input.isDown('KeyD')) {
        this.facingRight = true; // default facing right
      }
    }

    // Jump
    if (this.input.justPressed('Space') && this.jumpsRemaining > 0) {
      this.vy = JUMP_VELOCITY;
      this.jumpsRemaining--;
      this.onGround = false;
    }

    // Crouch
    this.crouching = this.onGround &&
      (this.input.isDown('ArrowDown') || this.input.isDown('KeyS'));

    // Aim direction
    this.aimAngle = this.calcAimAngle();

    // Apply horizontal movement
    this.x += this.vx * dt;

    // Reset jumps when landing
    if (this.onGround) {
      this.jumpsRemaining = MAX_JUMPS;
    }
  }

  private calcAimAngle(): number {
    const up = this.input.isDown('ArrowUp') || this.input.isDown('KeyW');
    const down = this.input.isDown('ArrowDown') || this.input.isDown('KeyS');
    const right = this.input.isDown('ArrowRight') || this.input.isDown('KeyD');
    const left = this.input.isDown('ArrowLeft') || this.input.isDown('KeyA');

    if (up && right) return -Math.PI / 4;
    if (up && left) return -3 * Math.PI / 4;
    if (up) return -Math.PI / 2;
    if (down && !this.onGround) return Math.PI / 2; // down-aim in air only
    return 0; // forward
  }
}
```

- [ ] **Step 5: Run Player tests**

```bash
npx vitest run test/entities/Player.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Write Camera tests**

`test/engine/Camera.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Camera } from '../../src/webview/engine/Camera';

describe('Camera', () => {
  let camera: Camera;

  beforeEach(() => {
    camera = new Camera(800, 600);
  });

  it('starts at x=0', () => {
    expect(camera.x).toBe(0);
  });

  it('scrolls right over time', () => {
    camera.update(1);
    expect(camera.x).toBeGreaterThan(0);
  });

  it('scrolls faster as speed increases', () => {
    camera.scrollSpeed = 100;
    camera.update(1);
    const x1 = camera.x;

    camera.x = 0;
    camera.scrollSpeed = 200;
    camera.update(1);
    expect(camera.x).toBeGreaterThan(x1);
  });

  it('converts world coords to screen coords', () => {
    camera.x = 500;
    const screenX = camera.toScreenX(600);
    expect(screenX).toBe(100);
  });
});
```

- [ ] **Step 7: Implement Camera**

`src/webview/engine/Camera.ts`:

```typescript
export class Camera {
  x = 0;
  y = 0;
  width: number;
  height: number;
  scrollSpeed = 80; // pixels per second, increases with difficulty

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  update(dt: number) {
    this.x += this.scrollSpeed * dt;
  }

  toScreenX(worldX: number): number {
    return worldX - this.x;
  }

  toScreenY(worldY: number): number {
    return worldY - this.y;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}
```

- [ ] **Step 8: Run Camera tests**

```bash
npx vitest run test/engine/Camera.test.ts
```

Expected: All tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/webview/entities/ src/webview/engine/Camera.ts test/
git commit -m "feat: entity base, player character, and camera with tests"
```

---

### Task 5: Physics + Gravity

**Files:**
- Create: `src/webview/engine/Physics.ts`
- Create: `test/engine/Physics.test.ts`

- [ ] **Step 1: Write Physics tests**

`test/engine/Physics.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { applyGravity, aabbOverlap } from '../../src/webview/engine/Physics';
import { Entity } from '../../src/webview/entities/Entity';

describe('applyGravity', () => {
  it('increases downward velocity', () => {
    const entity = new Entity(0, 0, 10, 10);
    entity.vy = 0;
    applyGravity(entity, 1 / 60);
    expect(entity.vy).toBeGreaterThan(0);
  });

  it('caps at terminal velocity', () => {
    const entity = new Entity(0, 0, 10, 10);
    entity.vy = 9999;
    applyGravity(entity, 1);
    expect(entity.vy).toBeLessThanOrEqual(600);
  });

  it('moves entity downward', () => {
    const entity = new Entity(0, 100, 10, 10);
    entity.vy = 100;
    applyGravity(entity, 1 / 60);
    expect(entity.y).toBeGreaterThan(100);
  });
});

describe('aabbOverlap', () => {
  it('detects overlapping entities', () => {
    const a = new Entity(0, 0, 10, 10);
    const b = new Entity(5, 5, 10, 10);
    expect(aabbOverlap(a, b)).toBe(true);
  });

  it('detects non-overlapping entities', () => {
    const a = new Entity(0, 0, 10, 10);
    const b = new Entity(20, 20, 10, 10);
    expect(aabbOverlap(a, b)).toBe(false);
  });

  it('detects edge-touching as non-overlapping', () => {
    const a = new Entity(0, 0, 10, 10);
    const b = new Entity(10, 0, 10, 10);
    expect(aabbOverlap(a, b)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run test/engine/Physics.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement Physics**

`src/webview/engine/Physics.ts`:

```typescript
import { Entity } from '../entities/Entity';

const GRAVITY = 1200; // pixels per second squared
const TERMINAL_VELOCITY = 600;

export function applyGravity(entity: Entity, dt: number) {
  entity.vy = Math.min(entity.vy + GRAVITY * dt, TERMINAL_VELOCITY);
  entity.y += entity.vy * dt;
}

export function aabbOverlap(a: Entity, b: Entity): boolean {
  return (
    a.left < b.right &&
    a.right > b.left &&
    a.top < b.bottom &&
    a.bottom > b.top
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run test/engine/Physics.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/webview/engine/Physics.ts test/engine/Physics.test.ts
git commit -m "feat: physics system with gravity and AABB collision"
```

---

### Task 6: Bullets + Shooting

**Files:**
- Create: `src/webview/entities/Bullet.ts`
- Create: `test/entities/Bullet.test.ts`

- [ ] **Step 1: Write Bullet tests**

`test/entities/Bullet.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { Bullet } from '../../src/webview/entities/Bullet';

describe('Bullet', () => {
  it('moves in the aimed direction', () => {
    const bullet = new Bullet(100, 100, 0, 'player'); // aim right
    bullet.update(1 / 60);
    expect(bullet.x).toBeGreaterThan(100);
    expect(bullet.y).toBeCloseTo(100, 0);
  });

  it('moves upper-right at 45 degrees', () => {
    const bullet = new Bullet(100, 100, -Math.PI / 4, 'player');
    bullet.update(1 / 60);
    expect(bullet.x).toBeGreaterThan(100);
    expect(bullet.y).toBeLessThan(100);
  });

  it('moves straight up', () => {
    const bullet = new Bullet(100, 100, -Math.PI / 2, 'player');
    bullet.update(1 / 60);
    expect(bullet.x).toBeCloseTo(100, 0);
    expect(bullet.y).toBeLessThan(100);
  });

  it('dies when off screen (based on lifetime)', () => {
    const bullet = new Bullet(100, 100, 0, 'player');
    // Simulate 3 seconds of travel
    for (let i = 0; i < 180; i++) {
      bullet.update(1 / 60);
    }
    expect(bullet.alive).toBe(false);
  });

  it('tracks owner (player vs enemy)', () => {
    const playerBullet = new Bullet(0, 0, 0, 'player');
    const enemyBullet = new Bullet(0, 0, 0, 'enemy');
    expect(playerBullet.owner).toBe('player');
    expect(enemyBullet.owner).toBe('enemy');
  });
});
```

- [ ] **Step 2: Run tests to verify fail**

```bash
npx vitest run test/entities/Bullet.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement Bullet**

`src/webview/entities/Bullet.ts`:

```typescript
import { Entity } from './Entity';

const BULLET_SPEED = 500;
const MAX_LIFETIME = 2; // seconds

export type BulletOwner = 'player' | 'enemy';

export class Bullet extends Entity {
  readonly owner: BulletOwner;
  readonly angle: number;
  private lifetime = 0;

  constructor(x: number, y: number, angle: number, owner: BulletOwner) {
    super(x, y, 6, 4);
    this.angle = angle;
    this.owner = owner;
    this.vx = Math.cos(angle) * BULLET_SPEED;
    this.vy = Math.sin(angle) * BULLET_SPEED;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifetime += dt;
    if (this.lifetime >= MAX_LIFETIME) {
      this.alive = false;
    }
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run test/entities/Bullet.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/webview/entities/Bullet.ts test/entities/Bullet.test.ts
git commit -m "feat: bullet entity with directional movement"
```

---

### Task 7: Terrain Generation

**Files:**
- Create: `src/webview/world/Terrain.ts`
- Create: `test/world/Terrain.test.ts`

- [ ] **Step 1: Write Terrain tests**

`test/world/Terrain.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Terrain, Platform } from '../../src/webview/world/Terrain';

describe('Terrain', () => {
  let terrain: Terrain;

  beforeEach(() => {
    terrain = new Terrain(600); // ground Y at 600
  });

  it('generates initial platforms including ground', () => {
    terrain.generate(0, 800);
    const platforms = terrain.getPlatforms();
    expect(platforms.length).toBeGreaterThan(0);
  });

  it('ground platform spans the visible area', () => {
    terrain.generate(0, 800);
    const ground = terrain.getPlatforms().find(p => p.isGround);
    expect(ground).toBeDefined();
    expect(ground!.width).toBeGreaterThanOrEqual(800);
  });

  it('generates new platforms as camera advances', () => {
    terrain.generate(0, 800);
    const count1 = terrain.getPlatforms().length;
    terrain.generate(800, 1600);
    const count2 = terrain.getPlatforms().length;
    expect(count2).toBeGreaterThanOrEqual(count1);
  });

  it('removes platforms behind the camera', () => {
    terrain.generate(0, 800);
    terrain.generate(800, 1600);
    terrain.cleanup(800);
    const platforms = terrain.getPlatforms();
    const allAfterCamera = platforms.every(p => p.x + p.width > 700);
    expect(allAfterCamera).toBe(true);
  });

  it('creates gaps in the ground at higher difficulty', () => {
    terrain.difficulty = 0.5;
    terrain.generate(0, 2000);
    const groundPlatforms = terrain.getPlatforms().filter(p => p.isGround);
    // With difficulty, ground should have gaps (multiple segments)
    expect(groundPlatforms.length).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run tests to verify fail**

```bash
npx vitest run test/world/Terrain.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement Terrain**

`src/webview/world/Terrain.ts`:

```typescript
export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  isGround: boolean;
}

export class Terrain {
  private platforms: Platform[] = [];
  private generatedUpTo = 0;
  private groundY: number;
  difficulty = 0; // 0 to 1

  constructor(groundY: number) {
    this.groundY = groundY;
  }

  generate(cameraLeft: number, cameraRight: number) {
    const generateTo = cameraRight + 400; // pre-generate ahead

    while (this.generatedUpTo < generateTo) {
      // Ground segments with occasional gaps
      const hasGap = Math.random() < this.difficulty * 0.3;
      const segmentWidth = 200 + Math.random() * 300;

      if (!hasGap) {
        this.platforms.push({
          x: this.generatedUpTo,
          y: this.groundY,
          width: segmentWidth,
          height: 40,
          isGround: true,
        });
      }

      // Elevated platforms
      if (Math.random() < 0.3 + this.difficulty * 0.2) {
        const platY = this.groundY - 80 - Math.random() * 120;
        const platWidth = 60 + Math.random() * 100;
        this.platforms.push({
          x: this.generatedUpTo + Math.random() * segmentWidth,
          y: platY,
          width: platWidth,
          height: 16,
          isGround: false,
        });
      }

      this.generatedUpTo += segmentWidth + (hasGap ? 60 + Math.random() * 40 : 0);
    }
  }

  cleanup(cameraLeft: number) {
    this.platforms = this.platforms.filter(
      (p) => p.x + p.width > cameraLeft - 100
    );
  }

  getPlatforms(): Platform[] {
    return this.platforms;
  }

  reset() {
    this.platforms = [];
    this.generatedUpTo = 0;
    this.difficulty = 0;
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run test/world/Terrain.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/webview/world/Terrain.ts test/world/Terrain.test.ts
git commit -m "feat: procedural terrain generation with difficulty scaling"
```

---

### Task 8: Enemies

**Files:**
- Create: `src/webview/entities/Soldier.ts`
- Create: `src/webview/entities/Flyer.ts`
- Create: `src/webview/entities/Turret.ts`
- Create: `src/webview/world/Spawner.ts`
- Create: `test/entities/enemies.test.ts`
- Create: `test/world/Spawner.test.ts`

- [ ] **Step 1: Write enemy tests**

`test/entities/enemies.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { Soldier } from '../../src/webview/entities/Soldier';
import { Flyer } from '../../src/webview/entities/Flyer';
import { Turret } from '../../src/webview/entities/Turret';

describe('Soldier', () => {
  it('moves toward player position', () => {
    const soldier = new Soldier(200, 300);
    soldier.update(1 / 60, 100); // playerX = 100, soldier is to the right
    expect(soldier.x).toBeLessThan(200);
  });

  it('dies in one hit (health = 1)', () => {
    const soldier = new Soldier(200, 300);
    expect(soldier.health).toBe(1);
  });
});

describe('Flyer', () => {
  it('moves in a sine wave pattern', () => {
    const flyer = new Flyer(200, 200);
    const startY = flyer.y;
    // Advance several frames
    for (let i = 0; i < 30; i++) {
      flyer.update(1 / 60, 100);
    }
    expect(flyer.y).not.toBe(startY);
  });

  it('moves toward player horizontally', () => {
    const flyer = new Flyer(200, 200);
    flyer.update(1 / 60, 100);
    expect(flyer.x).toBeLessThan(200);
  });
});

describe('Turret', () => {
  it('does not move', () => {
    const turret = new Turret(200, 300);
    turret.update(1 / 60, 100);
    expect(turret.x).toBe(200);
  });

  it('fires bullets at intervals', () => {
    const turret = new Turret(200, 300);
    let bullets: any[] = [];
    // Advance past fire interval
    for (let i = 0; i < 120; i++) {
      const b = turret.update(1 / 60, 100);
      if (b) bullets.push(b);
    }
    expect(bullets.length).toBeGreaterThan(0);
  });

  it('has more health than a soldier', () => {
    const turret = new Turret(200, 300);
    expect(turret.health).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run tests to verify fail**

```bash
npx vitest run test/entities/enemies.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement Soldier**

`src/webview/entities/Soldier.ts`:

```typescript
import { Entity } from './Entity';

const SOLDIER_SPEED = 60;

export class Soldier extends Entity {
  health = 1;
  readonly scoreValue = 10;

  constructor(x: number, y: number) {
    super(x, y, 20, 28);
  }

  update(dt: number, playerX: number) {
    const dir = playerX < this.x ? -1 : 1;
    this.x += dir * SOLDIER_SPEED * dt;
  }
}
```

- [ ] **Step 4: Implement Flyer**

`src/webview/entities/Flyer.ts`:

```typescript
import { Entity } from './Entity';

const FLYER_SPEED = 50;
const WAVE_AMPLITUDE = 40;
const WAVE_FREQUENCY = 3;

export class Flyer extends Entity {
  health = 1;
  readonly scoreValue = 20;
  private time = 0;
  private baseY: number;

  constructor(x: number, y: number) {
    super(x, y, 20, 16);
    this.baseY = y;
  }

  update(dt: number, playerX: number) {
    this.time += dt;
    const dir = playerX < this.x ? -1 : 1;
    this.x += dir * FLYER_SPEED * dt;
    this.y = this.baseY + Math.sin(this.time * WAVE_FREQUENCY) * WAVE_AMPLITUDE;
  }
}
```

- [ ] **Step 5: Implement Turret**

`src/webview/entities/Turret.ts`:

```typescript
import { Entity } from './Entity';
import { Bullet } from './Bullet';

const FIRE_INTERVAL = 1.5; // seconds

export class Turret extends Entity {
  health = 3;
  readonly scoreValue = 30;
  private fireTimer = 0;

  constructor(x: number, y: number) {
    super(x, y, 24, 24);
  }

  update(dt: number, playerX: number): Bullet | null {
    this.fireTimer += dt;
    if (this.fireTimer >= FIRE_INTERVAL) {
      this.fireTimer = 0;
      const angle = playerX < this.x ? Math.PI : 0;
      return new Bullet(this.centerX, this.centerY, angle, 'enemy');
    }
    return null;
  }
}
```

- [ ] **Step 6: Run enemy tests**

```bash
npx vitest run test/entities/enemies.test.ts
```

Expected: All tests PASS.

- [ ] **Step 7: Write Spawner tests**

`test/world/Spawner.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Spawner } from '../../src/webview/world/Spawner';

describe('Spawner', () => {
  let spawner: Spawner;

  beforeEach(() => {
    spawner = new Spawner();
  });

  it('spawns enemies over time', () => {
    const enemies = spawner.update(2, 0, 800, 500); // 2 seconds, score 0
    expect(enemies.length).toBeGreaterThan(0);
  });

  it('spawns more enemies at higher scores', () => {
    const low = spawner.update(5, 0, 0, 800);
    spawner.reset();
    const high = spawner.update(5, 1000, 0, 800);
    expect(high.length).toBeGreaterThanOrEqual(low.length);
  });

  it('spawns enemies ahead of camera', () => {
    const enemies = spawner.update(2, 0, 500, 500);
    enemies.forEach(e => {
      expect(e.x).toBeGreaterThanOrEqual(500);
    });
  });
});
```

- [ ] **Step 8: Implement Spawner**

`src/webview/world/Spawner.ts`:

```typescript
import { Entity } from '../entities/Entity';
import { Soldier } from '../entities/Soldier';
import { Flyer } from '../entities/Flyer';
import { Turret } from '../entities/Turret';

export class Spawner {
  private timer = 0;

  update(dt: number, score: number, cameraRight: number, groundY: number): Entity[] {
    this.timer += dt;

    const spawnInterval = Math.max(0.5, 2 - score / 1000);
    if (this.timer < spawnInterval) return [];

    this.timer = 0;
    const spawned: Entity[] = [];
    const spawnX = cameraRight + 50 + Math.random() * 100;

    // Pick enemy type based on score thresholds
    const roll = Math.random();
    const turretChance = score > 200 ? 0.2 : 0;
    const flyerChance = score > 100 ? 0.3 : 0;

    if (roll < turretChance) {
      spawned.push(new Turret(spawnX, groundY - 24));
    } else if (roll < turretChance + flyerChance) {
      const flyY = groundY - 100 - Math.random() * 100;
      spawned.push(new Flyer(spawnX, flyY));
    } else {
      spawned.push(new Soldier(spawnX, groundY - 28));
    }

    // Extra soldier at high scores
    if (score > 500 && Math.random() < 0.3) {
      spawned.push(new Soldier(spawnX + 40, groundY - 28));
    }

    return spawned;
  }

  reset() {
    this.timer = 0;
  }
}
```

- [ ] **Step 9: Run Spawner tests**

```bash
npx vitest run test/world/Spawner.test.ts
```

Expected: All tests PASS.

- [ ] **Step 10: Commit**

```bash
git add src/webview/entities/Soldier.ts src/webview/entities/Flyer.ts src/webview/entities/Turret.ts src/webview/world/Spawner.ts test/entities/enemies.test.ts test/world/Spawner.test.ts
git commit -m "feat: enemy types (soldier, flyer, turret) and spawner"
```

---

### Task 9: Collision + Scoring System

**Files:**
- Create: `src/webview/systems/Collision.ts`
- Create: `src/webview/systems/Score.ts`
- Create: `test/systems/Collision.test.ts`
- Create: `test/systems/Score.test.ts`

- [ ] **Step 1: Write Collision system tests**

`test/systems/Collision.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { resolveEntityPlatform } from '../../src/webview/systems/Collision';
import { Entity } from '../../src/webview/entities/Entity';
import { Platform } from '../../src/webview/world/Terrain';

describe('resolveEntityPlatform', () => {
  it('lands entity on top of platform', () => {
    const entity = new Entity(50, 90, 20, 20); // bottom at 110
    entity.vy = 100;
    const platform: Platform = { x: 0, y: 100, width: 200, height: 16, isGround: false };

    const landed = resolveEntityPlatform(entity, platform);
    expect(landed).toBe(true);
    expect(entity.y).toBe(100 - 20); // on top of platform
    expect(entity.vy).toBe(0);
  });

  it('does not land if moving upward', () => {
    const entity = new Entity(50, 90, 20, 20);
    entity.vy = -100; // moving up
    const platform: Platform = { x: 0, y: 100, width: 200, height: 16, isGround: false };

    const landed = resolveEntityPlatform(entity, platform);
    expect(landed).toBe(false);
  });

  it('does not land if not horizontally overlapping', () => {
    const entity = new Entity(300, 90, 20, 20);
    entity.vy = 100;
    const platform: Platform = { x: 0, y: 100, width: 200, height: 16, isGround: false };

    const landed = resolveEntityPlatform(entity, platform);
    expect(landed).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify fail**

```bash
npx vitest run test/systems/Collision.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement Collision system**

`src/webview/systems/Collision.ts`:

```typescript
import { Entity } from '../entities/Entity';
import { Platform } from '../world/Terrain';
import { aabbOverlap } from '../engine/Physics';

export function resolveEntityPlatform(entity: Entity, platform: Platform): boolean {
  // Only land if falling downward
  if (entity.vy <= 0) return false;

  // Check horizontal overlap
  if (entity.right <= platform.x || entity.left >= platform.x + platform.width) {
    return false;
  }

  // Check if entity's bottom is near the platform top
  const entityBottom = entity.bottom;
  const platTop = platform.y;
  const penetration = entityBottom - platTop;

  if (penetration > 0 && penetration < entity.vy * 0.05 + 10) {
    entity.y = platTop - entity.height;
    entity.vy = 0;
    return true;
  }

  return false;
}

export function checkEntityCollision(a: Entity, b: Entity): boolean {
  return aabbOverlap(a, b);
}
```

- [ ] **Step 4: Run Collision tests**

```bash
npx vitest run test/systems/Collision.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Write Score tests**

`test/systems/Score.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreSystem } from '../../src/webview/systems/Score';

describe('ScoreSystem', () => {
  let score: ScoreSystem;

  beforeEach(() => {
    score = new ScoreSystem();
  });

  it('starts at zero', () => {
    expect(score.current).toBe(0);
  });

  it('accumulates survival points over time', () => {
    score.addSurvivalTime(5);
    expect(score.current).toBe(5);
  });

  it('adds kill points', () => {
    score.addKill(10);
    expect(score.current).toBe(10);
  });

  it('tracks combo multiplier on rapid kills', () => {
    score.addKill(10); // 10
    score.addKill(10); // 10 * 1.5 = 15
    expect(score.current).toBe(25);
    expect(score.comboMultiplier).toBeCloseTo(1.5);
  });

  it('resets combo after timeout', () => {
    score.addKill(10);
    score.update(5); // 5 seconds pass
    expect(score.comboMultiplier).toBe(1);
  });

  it('caps combo at x3', () => {
    for (let i = 0; i < 20; i++) {
      score.addKill(10);
    }
    expect(score.comboMultiplier).toBeLessThanOrEqual(3);
  });

  it('tracks high score', () => {
    score.addKill(100);
    score.reset();
    expect(score.current).toBe(0);
    expect(score.highScore).toBe(100);
  });
});
```

- [ ] **Step 6: Implement Score system**

`src/webview/systems/Score.ts`:

```typescript
const COMBO_TIMEOUT = 2; // seconds without a kill to reset combo
const COMBO_STEP = 0.5; // multiplier increase per kill
const MAX_COMBO = 3;

export class ScoreSystem {
  current = 0;
  highScore = 0;
  comboMultiplier = 1;
  comboCount = 0;
  private comboTimer = 0;

  addSurvivalTime(seconds: number) {
    this.current += Math.floor(seconds);
  }

  addKill(basePoints: number) {
    if (this.comboCount > 0) {
      this.comboMultiplier = Math.min(1 + this.comboCount * COMBO_STEP, MAX_COMBO);
    }
    this.current += Math.floor(basePoints * this.comboMultiplier);
    this.comboCount++;
    this.comboTimer = 0;
  }

  update(dt: number) {
    this.comboTimer += dt;
    if (this.comboTimer >= COMBO_TIMEOUT) {
      this.comboMultiplier = 1;
      this.comboCount = 0;
    }
  }

  reset() {
    if (this.current > this.highScore) {
      this.highScore = this.current;
    }
    this.current = 0;
    this.comboMultiplier = 1;
    this.comboCount = 0;
    this.comboTimer = 0;
  }
}
```

- [ ] **Step 7: Run Score tests**

```bash
npx vitest run test/systems/Score.test.ts
```

Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/webview/systems/ test/systems/
git commit -m "feat: collision resolution and scoring system with combo"
```

---

### Task 10: Wire Everything into Game Loop

**Files:**
- Modify: `src/webview/engine/Game.ts`
- Modify: `src/webview/main.ts`
- Create: `src/webview/engine/Renderer.ts`

This task integrates all the pieces built in Tasks 3-9 into the actual game loop. This is primarily wiring code — the logic is already tested in individual unit tests.

- [ ] **Step 1: Create Renderer helper**

`src/webview/engine/Renderer.ts`:

```typescript
export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  clear(width: number, height: number) {
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, width, height);
  }

  drawRect(x: number, y: number, w: number, h: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
  }

  drawOutlineRect(x: number, y: number, w: number, h: number, color: string) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(Math.floor(x), Math.floor(y), w, h);
  }

  drawText(text: string, x: number, y: number, color: string, size = 14, align: CanvasTextAlign = 'left') {
    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px monospace`;
    this.ctx.textAlign = align;
    this.ctx.fillText(text, Math.floor(x), Math.floor(y));
  }

  drawCircle(x: number, y: number, radius: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(Math.floor(x), Math.floor(y), radius, 0, Math.PI * 2);
    this.ctx.fill();
  }
}
```

- [ ] **Step 2: Rewrite Game.ts to integrate all systems**

Replace `src/webview/engine/Game.ts` with:

```typescript
import { Input } from './Input';
import { Camera } from './Camera';
import { Renderer } from './Renderer';
import { applyGravity } from './Physics';
import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';
import { Entity } from '../entities/Entity';
import { Terrain } from '../world/Terrain';
import { Spawner } from '../world/Spawner';
import { ScoreSystem } from '../systems/Score';
import { resolveEntityPlatform, checkEntityCollision } from '../systems/Collision';

export type GameState = 'title' | 'playing' | 'dead';

const SHOOT_INTERVAL = 0.12; // seconds between shots when holding fire

export class Game {
  readonly canvas: HTMLCanvasElement;
  readonly input = new Input();
  private renderer: Renderer;
  private camera: Camera;
  private player!: Player;
  private bullets: Bullet[] = [];
  private enemies: Entity[] = [];
  private enemyBullets: Bullet[] = [];
  private terrain: Terrain;
  private spawner: Spawner;
  private score: ScoreSystem;

  state: GameState = 'title';
  private lastTime = 0;
  private running = false;
  private shootTimer = 0;
  private survivalTimer = 0;
  private groundY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d')!;
    this.renderer = new Renderer(ctx);
    this.camera = new Camera(canvas.width, canvas.height);
    this.groundY = canvas.height - 80;
    this.terrain = new Terrain(this.groundY);
    this.spawner = new Spawner();
    this.score = new ScoreSystem();

    this.initPlayer();

    window.addEventListener('keydown', (e) => {
      e.preventDefault();
      this.input.handleKeyDown(e.code);

      if (this.state === 'title' && e.code === 'Space') {
        this.startPlaying();
      }
      if (this.state === 'dead' && e.code === 'Space') {
        this.restart();
      }
    });
    window.addEventListener('keyup', (e) => {
      e.preventDefault();
      this.input.handleKeyUp(e.code);
    });
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.groundY = canvas.height - 80;
      this.camera.resize(canvas.width, canvas.height);
    });
  }

  private initPlayer() {
    this.player = new Player(200, this.groundY - 32, this.input);
    this.player.onGround = true;
  }

  private startPlaying() {
    this.state = 'playing';
    this.terrain.reset();
    this.spawner.reset();
    this.score.reset();
    this.bullets = [];
    this.enemies = [];
    this.enemyBullets = [];
    this.camera.x = 0;
    this.initPlayer();
  }

  private restart() {
    this.startPlaying();
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  stop() {
    this.running = false;
  }

  private loop(time: number) {
    if (!this.running) return;

    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    this.update(dt);
    this.render();
    this.input.endFrame();

    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number) {
    if (this.state !== 'playing') return;

    // Camera auto-scroll
    this.camera.update(dt);

    // Increase difficulty over time
    const difficultyFactor = Math.min(this.score.current / 2000, 1);
    this.terrain.difficulty = difficultyFactor;
    this.camera.scrollSpeed = 80 + difficultyFactor * 60;

    // Player keeps up with camera
    if (this.player.x < this.camera.x + 50) {
      this.player.x = this.camera.x + 50;
    }

    // Player update
    this.player.update(dt);
    applyGravity(this.player, dt);

    // Terrain
    this.terrain.generate(this.camera.x, this.camera.x + this.camera.width);
    this.terrain.cleanup(this.camera.x);

    // Platform collision for player
    this.player.onGround = false;
    for (const plat of this.terrain.getPlatforms()) {
      if (resolveEntityPlatform(this.player, plat)) {
        this.player.onGround = true;
      }
    }

    // Shooting
    const fireKey = this.input.isDown('KeyZ') || this.input.isDown('KeyJ');
    this.shootTimer += dt;
    if (fireKey && this.shootTimer >= SHOOT_INTERVAL) {
      this.shootTimer = 0;
      this.bullets.push(new Bullet(
        this.player.centerX,
        this.player.centerY,
        this.player.aimAngle,
        'player'
      ));
    }

    // Update bullets
    this.bullets.forEach(b => b.update(dt));
    this.bullets = this.bullets.filter(b => b.alive);
    this.enemyBullets.forEach(b => b.update(dt));
    this.enemyBullets = this.enemyBullets.filter(b => b.alive);

    // Spawn enemies
    const newEnemies = this.spawner.update(
      dt, this.score.current, this.camera.x + this.camera.width, this.groundY
    );
    this.enemies.push(...newEnemies);

    // Update enemies
    for (const enemy of this.enemies) {
      if ('update' in enemy && typeof (enemy as any).update === 'function') {
        const result = (enemy as any).update(dt, this.player.x);
        if (result instanceof Bullet) {
          this.enemyBullets.push(result);
        }
      }
    }

    // Bullet vs Enemy collision
    for (const bullet of this.bullets) {
      for (const enemy of this.enemies) {
        if (bullet.alive && enemy.alive && checkEntityCollision(bullet, enemy)) {
          bullet.alive = false;
          (enemy as any).health--;
          if ((enemy as any).health <= 0) {
            enemy.alive = false;
            this.score.addKill((enemy as any).scoreValue || 10);
          }
        }
      }
    }
    this.enemies = this.enemies.filter(e => e.alive);

    // Enemy bullet vs Player collision
    for (const bullet of this.enemyBullets) {
      if (checkEntityCollision(bullet, this.player)) {
        this.die();
        return;
      }
    }

    // Enemy vs Player collision
    for (const enemy of this.enemies) {
      if (checkEntityCollision(enemy, this.player)) {
        this.die();
        return;
      }
    }

    // Player falls off screen
    if (this.player.y > this.canvas.height + 100) {
      this.die();
      return;
    }

    // Cleanup off-screen enemies
    this.enemies = this.enemies.filter(e => e.x > this.camera.x - 200);

    // Score survival time
    this.survivalTimer += dt;
    if (this.survivalTimer >= 1) {
      this.score.addSurvivalTime(1);
      this.survivalTimer -= 1;
    }
    this.score.update(dt);
  }

  private die() {
    this.state = 'dead';
    this.score.reset(); // saves high score internally
  }

  private render() {
    const { renderer, canvas, camera } = this;
    renderer.clear(canvas.width, canvas.height);

    if (this.state === 'title') {
      renderer.drawText('CONTRA CODE', canvas.width / 2, canvas.height / 2 - 40, '#00ff00', 32, 'center');
      renderer.drawText('Press SPACE to start', canvas.width / 2, canvas.height / 2 + 20, '#888888', 16, 'center');
      return;
    }

    // Draw terrain
    for (const plat of this.terrain.getPlatforms()) {
      const sx = camera.toScreenX(plat.x);
      renderer.drawRect(sx, plat.y, plat.width, plat.height, plat.isGround ? '#3a2a1a' : '#555555');
    }

    // Draw enemies (placeholder colored rects)
    for (const enemy of this.enemies) {
      const sx = camera.toScreenX(enemy.x);
      renderer.drawRect(sx, enemy.y, enemy.width, enemy.height, '#ff4444');
    }

    // Draw player (placeholder)
    const playerSX = camera.toScreenX(this.player.x);
    const playerColor = this.player.crouching ? '#2299cc' : '#4fc3f7';
    renderer.drawRect(playerSX, this.player.y, this.player.width, this.player.height, playerColor);

    // Draw bullets
    for (const b of this.bullets) {
      const sx = camera.toScreenX(b.x);
      renderer.drawRect(sx, b.y, b.width, b.height, '#ffff00');
    }
    for (const b of this.enemyBullets) {
      const sx = camera.toScreenX(b.x);
      renderer.drawRect(sx, b.y, b.width, b.height, '#ff8800');
    }

    // HUD
    renderer.drawText(`Score: ${this.score.current}`, 10, 24, '#00ff00', 16);
    renderer.drawText(`High: ${this.score.highScore}`, 10, 44, '#888888', 14);
    if (this.score.comboMultiplier > 1) {
      renderer.drawText(`x${this.score.comboMultiplier.toFixed(1)} COMBO`, 10, 64, '#ff0', 14);
    }

    // Death screen
    if (this.state === 'dead') {
      renderer.drawText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20, '#ff0000', 28, 'center');
      renderer.drawText(`Score: ${this.score.highScore}`, canvas.width / 2, canvas.height / 2 + 20, '#ffffff', 18, 'center');
      renderer.drawText('Press SPACE to restart', canvas.width / 2, canvas.height / 2 + 50, '#888888', 14, 'center');
    }
  }
}
```

- [ ] **Step 3: Update main.ts**

Replace `src/webview/main.ts`:

```typescript
import { Game } from './engine/Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const game = new Game(canvas);
game.start();
```

- [ ] **Step 4: Build and play-test**

```bash
npm run build
```

F5 → "Contra Code: Start Game". Verify:
- Title screen appears, space starts game
- Player character (blue rect) appears, auto-scrolling works
- Arrow keys move left, space jumps, Z shoots yellow bullets
- Red enemies spawn and can be shot
- Collision with enemies or enemy bullets triggers death
- Score counts up, high score persists across deaths
- Space restarts on death screen

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: All existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/webview/
git commit -m "feat: full game loop with player, enemies, terrain, shooting, scoring"
```

---

## Phase 3: Game Polish

### Task 11: Boss Enemy

**Files:**
- Create: `src/webview/entities/Boss.ts`
- Modify: `src/webview/world/Spawner.ts`
- Modify: `src/webview/engine/Game.ts`

- [ ] **Step 1: Implement Boss**

`src/webview/entities/Boss.ts`:

```typescript
import { Entity } from './Entity';
import { Bullet } from './Bullet';

const BOSS_FIRE_INTERVAL = 0.8;
const BOSS_MOVE_SPEED = 30;

export class Boss extends Entity {
  health = 20;
  maxHealth = 20;
  readonly scoreValue = 200;
  private fireTimer = 0;
  private moveTimer = 0;
  private moveDir = 1;

  constructor(x: number, y: number) {
    super(x, y, 48, 48);
  }

  update(dt: number, playerX: number): Bullet[] {
    // Vertical bobbing movement
    this.moveTimer += dt;
    if (this.moveTimer > 2) {
      this.moveDir *= -1;
      this.moveTimer = 0;
    }
    this.y += this.moveDir * BOSS_MOVE_SPEED * dt;

    // Fire triple shot
    this.fireTimer += dt;
    const bullets: Bullet[] = [];
    if (this.fireTimer >= BOSS_FIRE_INTERVAL) {
      this.fireTimer = 0;
      const angleToPlayer = Math.atan2(0, playerX - this.x);
      bullets.push(new Bullet(this.centerX, this.centerY, angleToPlayer, 'enemy'));
      bullets.push(new Bullet(this.centerX, this.centerY, angleToPlayer - 0.3, 'enemy'));
      bullets.push(new Bullet(this.centerX, this.centerY, angleToPlayer + 0.3, 'enemy'));
    }
    return bullets;
  }
}
```

- [ ] **Step 2: Add Boss spawning to Spawner**

Add to the end of `src/webview/world/Spawner.ts`:

```typescript
import { Boss } from '../entities/Boss';
```

Add a `bossSpawned` tracker and modify the `update` method to check Boss spawn thresholds. Add these fields to the class:

```typescript
  private bossScoreThreshold = 500;
  private bossActive = false;

  setBossActive(active: boolean) {
    this.bossActive = active;
  }
```

Add Boss check at the start of `update`, before enemy spawning:

```typescript
    // Boss spawn check
    if (!this.bossActive && score >= this.bossScoreThreshold) {
      this.bossActive = true;
      this.bossScoreThreshold += 500;
      const bossY = groundY - 150;
      spawned.push(new Boss(cameraRight + 100, bossY));
    }
```

- [ ] **Step 3: Handle Boss in Game.ts**

In the `update` method of `Game.ts`, modify the enemy update loop to handle Boss returning an array of bullets:

```typescript
    for (const enemy of this.enemies) {
      if ('update' in enemy && typeof (enemy as any).update === 'function') {
        const result = (enemy as any).update(dt, this.player.x);
        if (result instanceof Bullet) {
          this.enemyBullets.push(result);
        } else if (Array.isArray(result)) {
          this.enemyBullets.push(...result);
        }
      }
    }
```

In the `render` method, add Boss health bar rendering after drawing enemies:

```typescript
    // Draw Boss health bars
    for (const enemy of this.enemies) {
      if ('maxHealth' in enemy) {
        const boss = enemy as any;
        const sx = camera.toScreenX(boss.x);
        const barWidth = boss.width;
        const healthRatio = boss.health / boss.maxHealth;
        renderer.drawRect(sx, boss.y - 8, barWidth, 4, '#333');
        renderer.drawRect(sx, boss.y - 8, barWidth * healthRatio, 4, '#ff0000');
      }
    }
```

When a Boss dies, update spawner:

```typescript
          if ((enemy as any).health <= 0) {
            enemy.alive = false;
            this.score.addKill((enemy as any).scoreValue || 10);
            if (enemy instanceof Boss) {
              this.spawner.setBossActive(false);
            }
          }
```

Add the import at the top of Game.ts:

```typescript
import { Boss } from '../entities/Boss';
```

- [ ] **Step 4: Build and test Boss fight**

```bash
npm run build
```

Play-test: survive until score reaches 500, verify Boss appears with health bar, fires triple shots, can be killed for 200 points.

- [ ] **Step 5: Commit**

```bash
git add src/webview/entities/Boss.ts src/webview/world/Spawner.ts src/webview/engine/Game.ts
git commit -m "feat: boss enemy with health bar and triple shot"
```

---

### Task 12: Pixel Art Sprites

**Files:**
- Create: `src/webview/sprites/SpriteData.ts`
- Modify: `src/webview/engine/Renderer.ts`
- Modify: `src/webview/engine/Game.ts` (render method)

This task replaces placeholder colored rectangles with pixel art sprites. Sprites are defined as 2D arrays of hex color strings (or null for transparent), drawn pixel-by-pixel onto the canvas at a scale factor.

- [ ] **Step 1: Create sprite data**

`src/webview/sprites/SpriteData.ts`:

```typescript
// Each sprite is a 2D array of hex color strings (null = transparent)
// Drawn at 2x scale (each pixel = 2x2 screen pixels)
export type SpriteFrame = (string | null)[][];

// Player standing (12x16 pixels, drawn at 2x = 24x32 screen)
export const PLAYER_STAND: SpriteFrame = [
  [null,null,null,null,'#4a6','#4a6','#4a6','#4a6',null,null,null,null],
  [null,null,null,'#4a6','#5b7','#5b7','#5b7','#5b7','#4a6',null,null,null],
  [null,null,null,'#fc9','#fc9','#fc9','#fc9','#fc9','#fc9',null,null,null],
  [null,null,'#fc9','#fc9','#000','#fc9','#fc9','#000','#fc9','#fc9',null,null],
  [null,null,'#fc9','#fc9','#fc9','#fc9','#fc9','#fc9','#fc9','#fc9',null,null],
  [null,null,null,'#fc9','#fc9','#c66','#c66','#fc9','#fc9',null,null,null],
  [null,null,'#4a6','#4a6','#4a6','#4a6','#4a6','#4a6','#4a6','#4a6',null,null],
  [null,'#4a6','#4a6','#4a6','#4a6','#4a6','#4a6','#4a6','#4a6','#4a6','#4a6',null],
  ['#4a6','#4a6','#4a6','#4a6','#4a6','#4a6','#4a6','#4a6','#4a6','#4a6','#4a6','#4a6'],
  [null,null,'#fc9','#fc9','#4a6','#4a6','#4a6','#4a6','#fc9','#fc9',null,null],
  [null,null,'#fc9','#fc9','#4a6','#4a6','#4a6','#4a6','#fc9','#fc9',null,null],
  [null,null,'#fc9','#fc9','#4a6','#4a6','#4a6','#4a6','#fc9','#fc9',null,null],
  [null,null,'#48c','#48c','#48c','#48c','#48c','#48c','#48c','#48c',null,null],
  [null,null,'#48c','#48c','#48c',null,null,'#48c','#48c','#48c',null,null],
  [null,'#630','#630','#630',null,null,null,null,'#630','#630','#630',null],
  [null,'#630','#630','#630',null,null,null,null,'#630','#630','#630',null],
];

// Soldier enemy (10x14 pixels)
export const ENEMY_SOLDIER: SpriteFrame = [
  [null,null,null,'#a33','#a33','#a33','#a33',null,null,null],
  [null,null,'#a33','#c44','#c44','#c44','#c44','#a33',null,null],
  [null,null,'#fc9','#fc9','#fc9','#fc9','#fc9','#fc9',null,null],
  [null,'#fc9','#000','#fc9','#fc9','#fc9','#000','#fc9','#fc9',null],
  [null,'#fc9','#fc9','#fc9','#c66','#c66','#fc9','#fc9','#fc9',null],
  [null,null,'#a33','#a33','#a33','#a33','#a33','#a33',null,null],
  [null,'#a33','#a33','#a33','#a33','#a33','#a33','#a33','#a33',null],
  ['#a33','#a33','#a33','#a33','#a33','#a33','#a33','#a33','#a33','#a33'],
  [null,null,'#fc9','#a33','#a33','#a33','#a33','#fc9',null,null],
  [null,null,'#a33','#a33','#a33','#a33','#a33','#a33',null,null],
  [null,null,'#a33','#a33',null,null,'#a33','#a33',null,null],
  [null,null,'#a33','#a33',null,null,'#a33','#a33',null,null],
  [null,'#333','#333','#333',null,null,'#333','#333','#333',null],
  [null,'#333','#333','#333',null,null,'#333','#333','#333',null],
];

// Bullet (3x2 pixels)
export const BULLET_PLAYER: SpriteFrame = [
  ['#ff0','#ff0','#ffa'],
  ['#ff0','#ff0','#ffa'],
];

export const BULLET_ENEMY: SpriteFrame = [
  ['#f80','#f80','#fa0'],
  ['#f80','#f80','#fa0'],
];
```

- [ ] **Step 2: Add sprite rendering to Renderer**

Add to `src/webview/engine/Renderer.ts`:

```typescript
import { SpriteFrame } from '../sprites/SpriteData';

  drawSprite(sprite: SpriteFrame, x: number, y: number, scale = 2, flipX = false) {
    const rows = sprite.length;
    const cols = sprite[0].length;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const color = sprite[row][flipX ? cols - 1 - col : col];
        if (color) {
          this.ctx.fillStyle = color;
          this.ctx.fillRect(
            Math.floor(x + col * scale),
            Math.floor(y + row * scale),
            scale,
            scale
          );
        }
      }
    }
  }
```

- [ ] **Step 3: Update Game.render() to use sprites**

In `Game.ts`, import the sprite data:

```typescript
import { PLAYER_STAND, ENEMY_SOLDIER, BULLET_PLAYER, BULLET_ENEMY } from '../sprites/SpriteData';
```

Replace the placeholder `drawRect` calls in `render()` with `drawSprite` calls:

```typescript
    // Player
    const playerSX = camera.toScreenX(this.player.x);
    this.renderer.drawSprite(PLAYER_STAND, playerSX, this.player.y, 2, !this.player.facingRight);

    // Enemies
    for (const enemy of this.enemies) {
      const sx = camera.toScreenX(enemy.x);
      this.renderer.drawSprite(ENEMY_SOLDIER, sx, enemy.y, 2);
    }

    // Bullets
    for (const b of this.bullets) {
      const sx = camera.toScreenX(b.x);
      this.renderer.drawSprite(BULLET_PLAYER, sx, b.y, 2);
    }
    for (const b of this.enemyBullets) {
      const sx = camera.toScreenX(b.x);
      this.renderer.drawSprite(BULLET_ENEMY, sx, b.y, 2);
    }
```

- [ ] **Step 4: Build and verify visuals**

```bash
npm run build
```

F5 → Play. Verify pixel art characters appear instead of plain rectangles.

- [ ] **Step 5: Commit**

```bash
git add src/webview/sprites/ src/webview/engine/Renderer.ts src/webview/engine/Game.ts
git commit -m "feat: pixel art sprites for player, enemies, and bullets"
```

---

## Phase 4: VS Code Integration

### Task 13: Status Bar + Focus Mechanism

**Files:**
- Create: `src/extension/statusBar.ts`
- Create: `src/extension/config.ts`
- Modify: `src/extension/extension.ts`
- Modify: `src/extension/gamePanel.ts`

- [ ] **Step 1: Create config reader**

`src/extension/config.ts`:

```typescript
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
```

- [ ] **Step 2: Create Status Bar manager**

`src/extension/statusBar.ts`:

```typescript
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
```

- [ ] **Step 3: Update extension.ts with status bar and focus mechanism**

Replace `src/extension/extension.ts`:

```typescript
import * as vscode from 'vscode';
import { GamePanel } from './gamePanel';
import { StatusBar } from './statusBar';
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

  // Listen for panel disposal
  GamePanel.onDispose(() => {
    statusBar.setGameActive(false);
  });
}

export function deactivate() {
  GamePanel.dispose();
  statusBar?.dispose();
}
```

- [ ] **Step 4: Add messaging to GamePanel**

Update `src/extension/gamePanel.ts` to support sending messages to the webview and an onDispose callback:

```typescript
import * as vscode from 'vscode';

type DisposeCallback = () => void;

export class GamePanel {
  private static instance: GamePanel | undefined;
  private static disposeCallbacks: DisposeCallback[] = [];
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    this.panel.webview.html = this.getHtml();

    this.panel.onDidDispose(() => {
      GamePanel.instance = undefined;
      GamePanel.disposeCallbacks.forEach(cb => cb());
    });
  }

  static createOrShow(context: vscode.ExtensionContext) {
    if (GamePanel.instance) {
      GamePanel.instance.panel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'contraCode',
      'Contra Code',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview'),
        ],
      }
    );

    GamePanel.instance = new GamePanel(panel, context.extensionUri);
  }

  static dispose() {
    if (GamePanel.instance) {
      GamePanel.instance.panel.dispose();
      GamePanel.instance = undefined;
    }
  }

  static sendMessage(message: any) {
    GamePanel.instance?.panel.webview.postMessage(message);
  }

  static onDispose(callback: DisposeCallback) {
    GamePanel.disposeCallbacks.push(callback);
  }

  private getHtml(): string {
    const scriptUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'main.js')
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
    canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated; }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
```

- [ ] **Step 5: Build and test**

```bash
npm run build
```

F5 → Verify status bar shows "Contra Code" icon, click starts game, click again stops. Playing state shown in status bar.

- [ ] **Step 6: Commit**

```bash
git add src/extension/
git commit -m "feat: status bar integration, config, and panel messaging"
```

---

### Task 14: Wait-State Detection

**Files:**
- Create: `src/extension/waitDetector.ts`
- Modify: `src/extension/extension.ts`

- [ ] **Step 1: Implement WaitDetector**

`src/extension/waitDetector.ts`:

```typescript
import * as vscode from 'vscode';

const LONG_RUNNING_COMMANDS = [
  'npm run build', 'npm run test', 'npm test', 'yarn build', 'yarn test',
  'pnpm build', 'pnpm test', 'git push', 'git pull', 'docker build',
  'cargo build', 'cargo test', 'go build', 'go test', 'make',
  'npx vitest', 'npx jest', 'npx tsc', 'webpack', 'vite build',
];

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

    // Monitor VS Code tasks
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

    // Monitor terminal creation (heuristic for long-running commands)
    this.disposables.push(
      vscode.window.onDidOpenTerminal((terminal) => {
        // We can't reliably read terminal content, but we can detect new terminals
        // The status bar prompt is non-intrusive so false positives are acceptable
      })
    );
  }

  dispose() {
    this.disposables.forEach(d => d.dispose());
  }
}
```

- [ ] **Step 2: Wire WaitDetector into extension.ts**

Add to `activate()` in `src/extension/extension.ts`, after status bar creation:

```typescript
  let waitDetector: WaitDetector | undefined;

  if (getConfig().smartDetection) {
    waitDetector = new WaitDetector(
      (taskName) => statusBar.showWaitingPrompt(taskName),
      () => statusBar.clearWaitingPrompt(),
    );
    context.subscriptions.push(waitDetector);
  }
```

Add the import:

```typescript
import { WaitDetector } from './waitDetector';
```

- [ ] **Step 3: Build and test**

```bash
npm run build
```

F5 → Open terminal, run a task via VS Code Tasks. Verify status bar shows prompt.

- [ ] **Step 4: Commit**

```bash
git add src/extension/waitDetector.ts src/extension/extension.ts
git commit -m "feat: wait-state detection for build/test tasks"
```

---

## Phase 5: Online Features

### Task 15: Leaderboard (Supabase)

**Files:**
- Create: `src/webview/network/LeaderboardAPI.ts`
- Create: `src/webview/ui/LeaderboardUI.ts`
- Create: `src/webview/ui/DeathScreen.ts`
- Create: `test/network/LeaderboardAPI.test.ts`
- Modify: `src/webview/engine/Game.ts`

- [ ] **Step 1: Write LeaderboardAPI tests**

`test/network/LeaderboardAPI.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeaderboardAPI } from '../../src/webview/network/LeaderboardAPI';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('LeaderboardAPI', () => {
  let api: LeaderboardAPI;

  beforeEach(() => {
    api = new LeaderboardAPI('https://test.supabase.co', 'test-anon-key');
    mockFetch.mockReset();
  });

  it('submits score with POST', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    await api.submitScore('TestPlayer', 42);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://test.supabase.co/rest/v1/scores',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'apikey': 'test-anon-key',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ nickname: 'TestPlayer', score: 42 }),
      })
    );
  });

  it('fetches top scores', async () => {
    const mockScores = [
      { nickname: 'Player1', score: 100, created_at: '2026-01-01' },
      { nickname: 'Player2', score: 50, created_at: '2026-01-02' },
    ];
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockScores) });

    const scores = await api.getTopScores(10);

    expect(scores).toEqual(mockScores);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('order=score.desc&limit=10'),
      expect.any(Object)
    );
  });

  it('handles fetch errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const scores = await api.getTopScores(10);
    expect(scores).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify fail**

```bash
npx vitest run test/network/LeaderboardAPI.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement LeaderboardAPI**

`src/webview/network/LeaderboardAPI.ts`:

```typescript
export interface ScoreEntry {
  nickname: string;
  score: number;
  created_at: string;
}

export class LeaderboardAPI {
  private baseUrl: string;
  private apiKey: string;

  constructor(supabaseUrl: string, anonKey: string) {
    this.baseUrl = supabaseUrl;
    this.apiKey = anonKey;
  }

  async submitScore(nickname: string, score: number): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/rest/v1/scores`, {
        method: 'POST',
        headers: {
          'apikey': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ nickname, score }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getTopScores(limit = 100): Promise<ScoreEntry[]> {
    try {
      const res = await fetch(
        `${this.baseUrl}/rest/v1/scores?select=nickname,score,created_at&order=score.desc&limit=${limit}`,
        {
          headers: {
            'apikey': this.apiKey,
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run test/network/LeaderboardAPI.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Implement DeathScreen UI**

`src/webview/ui/DeathScreen.ts`:

```typescript
import { Renderer } from '../engine/Renderer';
import { LeaderboardAPI } from '../network/LeaderboardAPI';

export class DeathScreen {
  private submitted = false;
  private submitting = false;

  render(renderer: Renderer, canvasW: number, canvasH: number, score: number, highScore: number) {
    // Semi-transparent overlay
    renderer.drawRect(0, 0, canvasW, canvasH, 'rgba(0,0,0,0.7)');

    const cx = canvasW / 2;
    const cy = canvasH / 2;

    renderer.drawText('GAME OVER', cx, cy - 60, '#ff0000', 32, 'center');
    renderer.drawText(`Score: ${score}`, cx, cy - 20, '#ffffff', 20, 'center');
    renderer.drawText(`High Score: ${highScore}`, cx, cy + 10, '#ffff00', 16, 'center');

    if (this.submitted) {
      renderer.drawText('Score submitted!', cx, cy + 50, '#00ff00', 14, 'center');
    } else if (this.submitting) {
      renderer.drawText('Submitting...', cx, cy + 50, '#888888', 14, 'center');
    } else {
      renderer.drawText('Press Enter to submit score', cx, cy + 50, '#888888', 14, 'center');
    }

    renderer.drawText('Press SPACE to restart', cx, cy + 80, '#888888', 14, 'center');
  }

  async submitScore(api: LeaderboardAPI, nickname: string, score: number) {
    if (this.submitted || this.submitting) return;
    this.submitting = true;
    const success = await api.submitScore(nickname, score);
    this.submitting = false;
    this.submitted = success;
  }

  reset() {
    this.submitted = false;
    this.submitting = false;
  }
}
```

- [ ] **Step 6: Implement LeaderboardUI**

`src/webview/ui/LeaderboardUI.ts`:

```typescript
import { Renderer } from '../engine/Renderer';
import { ScoreEntry } from '../network/LeaderboardAPI';

export class LeaderboardUI {
  private scores: ScoreEntry[] = [];
  visible = false;

  setScores(scores: ScoreEntry[]) {
    this.scores = scores;
  }

  render(renderer: Renderer, canvasW: number, canvasH: number) {
    if (!this.visible) return;

    renderer.drawRect(0, 0, canvasW, canvasH, 'rgba(0,0,0,0.85)');

    const cx = canvasW / 2;
    renderer.drawText('LEADERBOARD', cx, 50, '#00ff00', 28, 'center');
    renderer.drawText('Press Esc to close', cx, 80, '#666', 12, 'center');

    const startY = 120;
    const lineHeight = 24;

    for (let i = 0; i < Math.min(this.scores.length, 20); i++) {
      const s = this.scores[i];
      const y = startY + i * lineHeight;
      const rankColor = i < 3 ? '#ffff00' : '#cccccc';
      renderer.drawText(`${i + 1}.`, cx - 150, y, rankColor, 14, 'left');
      renderer.drawText(s.nickname, cx - 120, y, '#ffffff', 14, 'left');
      renderer.drawText(s.score.toString(), cx + 150, y, '#00ff00', 14, 'right');
    }

    if (this.scores.length === 0) {
      renderer.drawText('No scores yet. Be the first!', cx, startY + 40, '#888', 16, 'center');
    }
  }
}
```

- [ ] **Step 7: Integrate leaderboard into Game.ts**

Add imports and initialize in the Game constructor:

```typescript
import { LeaderboardAPI } from '../network/LeaderboardAPI';
import { DeathScreen } from '../ui/DeathScreen';
import { LeaderboardUI } from '../ui/LeaderboardUI';
```

Add fields:

```typescript
  private leaderboardAPI: LeaderboardAPI;
  private deathScreen = new DeathScreen();
  private leaderboardUI = new LeaderboardUI();
  private nickname = 'Anonymous';
```

Initialize in constructor (use placeholder URL — will be configurable):

```typescript
    this.leaderboardAPI = new LeaderboardAPI(
      'YOUR_SUPABASE_URL',
      'YOUR_SUPABASE_ANON_KEY'
    );
```

In the keydown handler, add Enter to submit and Esc for leaderboard:

```typescript
      if (this.state === 'dead' && e.code === 'Enter') {
        this.deathScreen.submitScore(this.leaderboardAPI, this.nickname, this.score.highScore);
      }
      if (e.code === 'Escape') {
        this.leaderboardUI.visible = false;
      }
```

Update `die()`:

```typescript
  private die() {
    this.state = 'dead';
    this.score.reset();
    this.deathScreen.reset();
  }
```

Update `render()` to use DeathScreen and LeaderboardUI:

```typescript
    if (this.state === 'dead') {
      this.deathScreen.render(this.renderer, canvas.width, canvas.height, this.score.current, this.score.highScore);
    }
    this.leaderboardUI.render(this.renderer, canvas.width, canvas.height);
```

Handle messages from extension host:

```typescript
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'showLeaderboard') {
        this.leaderboardUI.visible = true;
        this.leaderboardAPI.getTopScores(20).then(scores => {
          this.leaderboardUI.setScores(scores);
        });
      }
      if (msg.type === 'setNickname') {
        this.nickname = msg.nickname;
      }
    });
```

- [ ] **Step 8: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/webview/network/ src/webview/ui/ test/network/ src/webview/engine/Game.ts
git commit -m "feat: leaderboard with Supabase, death screen, and leaderboard UI"
```

---

### Task 16: Audio System

**Files:**
- Create: `src/webview/audio/AudioManager.ts`
- Modify: `src/webview/engine/Game.ts`

- [ ] **Step 1: Implement AudioManager**

`src/webview/audio/AudioManager.ts`:

```typescript
export class AudioManager {
  private audioCtx: AudioContext | null = null;
  private musicVolume = 0.5;
  private sfxVolume = 0.7;
  enabled = true;

  private getCtx(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  setMusicVolume(v: number) { this.musicVolume = v; }
  setSfxVolume(v: number) { this.sfxVolume = v; }

  playSfx(type: 'shoot' | 'jump' | 'kill' | 'die' | 'boss') {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = this.sfxVolume * 0.3;

    const now = ctx.currentTime;

    switch (type) {
      case 'shoot':
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.linearRampToValueAtTime(440, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      case 'jump':
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.1);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'kill':
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.15);
        osc.type = 'square';
        gain.gain.linearRampToValueAtTime(0, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      case 'die':
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.5);
        osc.type = 'sawtooth';
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case 'boss':
        osc.frequency.setValueAtTime(150, now);
        osc.type = 'square';
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
    }
  }
}
```

- [ ] **Step 2: Integrate audio into Game.ts**

Add import and field:

```typescript
import { AudioManager } from '../audio/AudioManager';
```

```typescript
  private audio = new AudioManager();
```

Add `this.audio.playSfx('shoot')` when creating a bullet, `this.audio.playSfx('jump')` in jump handler, `this.audio.playSfx('kill')` on enemy death, `this.audio.playSfx('die')` in `die()`, and `this.audio.playSfx('boss')` when Boss spawns.

Handle audio config from extension messages:

```typescript
      if (msg.type === 'setAudioConfig') {
        this.audio.enabled = msg.enabled;
        this.audio.setMusicVolume(msg.musicVolume);
        this.audio.setSfxVolume(msg.sfxVolume);
      }
```

- [ ] **Step 3: Build and test audio**

```bash
npm run build
```

F5 → Play. Verify sounds play on shoot, jump, kill, and death.

- [ ] **Step 4: Commit**

```bash
git add src/webview/audio/ src/webview/engine/Game.ts
git commit -m "feat: audio system with synthesized 8-bit sound effects"
```

---

## Phase 6: Packaging

### Task 17: Final Polish + Marketplace Packaging

**Files:**
- Create: `media/icon.png` (placeholder)
- Modify: `package.json` (final metadata)
- Modify: `src/extension/extension.ts` (send config to webview on start)

- [ ] **Step 1: Send config to webview on panel creation**

In `src/extension/gamePanel.ts`, add a method to push config to the webview after creation. In the constructor, after setting HTML:

```typescript
    // Send initial config
    const config = getConfig();
    setTimeout(() => {
      this.panel.webview.postMessage({
        type: 'setNickname',
        nickname: config.nickname || 'Anonymous',
      });
      this.panel.webview.postMessage({
        type: 'setAudioConfig',
        enabled: config.audioEnabled,
        musicVolume: config.musicVolume,
        sfxVolume: config.sfxVolume,
      });
    }, 500);
```

Add import:

```typescript
import { getConfig } from './config';
```

- [ ] **Step 2: Create placeholder icon**

Create a simple 128x128 PNG icon at `media/icon.png`. For now, generate a simple one:

```bash
# Use any image tool or create a simple placeholder
# This step will be replaced with proper pixel art icon later
```

- [ ] **Step 3: Update package.json with icon and marketplace metadata**

Add to `package.json`:

```json
  "icon": "media/icon.png",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/contra-code"
  },
  "keywords": ["game", "contra", "pixel-art", "fun", "break"],
  "license": "MIT"
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 5: Build and full play-test**

```bash
npm run build
```

Full play-test checklist:
- [ ] Title screen → Space to start
- [ ] Player moves left, jumps with space
- [ ] Eight-direction shooting works
- [ ] Enemies spawn and can be killed
- [ ] Score counts up, combo multiplier works
- [ ] Boss appears at 500 points
- [ ] Death → death screen with score
- [ ] Space to restart from death
- [ ] Status bar shows game state
- [ ] Sound effects play
- [ ] Leaderboard accessible via command palette

- [ ] **Step 6: Package extension**

```bash
npm install -g @vscode/vsce
vsce package
```

This creates `contra-code-0.1.0.vsix` that can be installed in VS Code.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: final polish and marketplace packaging"
```

---

## Supabase Setup (Manual Steps)

These steps are done once in the Supabase dashboard, not in code:

1. Create a new Supabase project
2. Run the SQL from the design spec to create the `scores` table with indexes and RLS policies
3. Copy the project URL and anon key
4. Update `LeaderboardAPI` constructor call in `Game.ts` with real values (or pass via extension config/message)

---

## Post-Plan Notes

- **Pixel art quality:** The sprite data in Task 12 is a starting point. Higher quality sprites with animation frames (running, jumping, shooting, crouching) should be iterated on after the core gameplay is working.
- **Background music:** The AudioManager currently only does synthesized SFX. AI-generated background music tracks should be added as audio files loaded via Web Audio API.
- **Overlay investigation:** V2 could explore Electron BrowserWindow injection for true transparent overlay on top of the editor. This is a separate research spike.
