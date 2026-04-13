# 🎮 Contra Code

**Kill time between builds — Contra-style.**

A VS Code / Cursor extension that brings a Contra-inspired pixel-art run-and-gun game right into your editor. Play in the bottom panel while waiting for builds, tests, and deploys.

![VS Code](https://img.shields.io/badge/VS%20Code-Extension-blue?logo=visualstudiocode) ![Cursor](https://img.shields.io/badge/Cursor-Compatible-purple) ![License](https://img.shields.io/badge/license-MIT-green)

## Why?

Developers spend a lot of time waiting — builds, CI/CD pipelines, test suites, deployments. Instead of staring at a spinning terminal, why not run through a quick round of pixel-art shooting action?

Contra Code lives in your editor's bottom panel. Code on top, game on the bottom. No context switching, no separate app.

Works with **VS Code** and **Cursor**.

## Features

- 🔫 **Contra-inspired run-and-gun** — Side-scrolling shooter with 8-directional aiming
- 🏃 **Infinite runner mode** — Auto-scrolling, no levels, just survive as long as you can
- 👾 **4 enemy types** — Ground soldiers, flying enemies, turrets, and bosses
- 📈 **Score & combo system** — Chain kills for multiplier bonuses, chase your high score
- 🏆 **Global leaderboard** — Compete with developers worldwide (Supabase-powered)
- 🎵 **8-bit audio** — Synthesized retro sound effects + background music
- ⏳ **Smart detection** — Status bar prompts you to play when builds/tests are running
- 🎮 **Bottom panel integration** — Plays alongside Terminal, Problems, Output tabs

## Install

### From VSIX

```bash
# Clone and build
git clone https://github.com/yangyue1974/contra-code.git
cd contra-code
npm install
npm run build
npx @vscode/vsce package --allow-missing-repository

# Install in VS Code
code --install-extension contra-code-0.1.0.vsix

# Or install in Cursor
cursor --install-extension contra-code-0.1.0.vsix
```

### From Marketplace (Coming Soon)

Search "Contra Code" in the VS Code / Cursor Extensions panel.

### Cursor Compatibility

Contra Code is fully compatible with [Cursor](https://cursor.com). Cursor is built on VS Code, so the extension works identically — same controls, same features, same bottom panel experience.

## How to Play

1. Open VS Code
2. Look at the bottom panel (where Terminal lives) — click the **"CONTRA CODE"** tab
3. Or click the **🎮 Contra Code** button in the status bar (bottom right)
4. Or use **Cmd+Shift+P** → `Contra Code: Focus Game`

### Controls

| Key | Action |
|-----|--------|
| **Space** | Jump (double jump supported) |
| **← →** (Arrow keys) | Move left / right |
| **Z** or **J** | Shoot (hold for auto-fire) |
| **↑** | Aim up |
| **↑ + →** | Aim 45° upper-right |
| **↑ + ←** | Aim 45° upper-left |
| **↓** (in air) | Aim down |
| **↓** (on ground) | Crouch |

### How It Works

- The screen auto-scrolls to the right — keep up!
- Shoot enemies to score points
- Kill enemies quickly for **combo multipliers** (up to 3x)
- **Bosses** appear every 500 points with health bars and triple-shot attacks
- Die = instant restart, score resets — chase that high score!

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `contraCode.enabled` | `true` | Enable/disable the extension |
| `contraCode.smartDetection` | `true` | Show play prompt during builds/tests |
| `contraCode.audioEnabled` | `true` | Enable game audio |
| `contraCode.musicVolume` | `0.5` | Background music volume (0-1) |
| `contraCode.sfxVolume` | `0.7` | Sound effects volume (0-1) |
| `contraCode.nickname` | `""` | Your leaderboard nickname |

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Extension | VS Code Extension API (TypeScript) |
| Game engine | HTML5 Canvas 2D in WebviewView |
| Audio | Web Audio API (synthesized 8-bit SFX) |
| Leaderboard | Supabase (PostgreSQL + REST API) |
| Build | esbuild (dual target: Node.js + browser) |
| Tests | Vitest (60 tests) |

## Development

```bash
# Install dependencies
npm install

# Build (extension + webview + overlay)
npm run build

# Watch mode
npm run watch

# Run tests
npm test

# Package for distribution
npx @vscode/vsce package --allow-missing-repository
```

### Project Structure

```
contra-code/
├── src/
│   ├── extension/          # VS Code extension host
│   │   ├── extension.ts    # Entry point, commands
│   │   ├── gamePanel.ts    # Webview tab (legacy)
│   │   ├── gamePanelView.ts # Bottom panel view
│   │   ├── statusBar.ts    # Status bar integration
│   │   ├── waitDetector.ts # Build/test detection
│   │   └── config.ts       # Settings reader
│   └── webview/            # Game (runs in browser)
│       ├── engine/         # Game loop, input, camera, physics, renderer
│       ├── entities/       # Player, bullets, enemies, boss
│       ├── world/          # Terrain generation, enemy spawner
│       ├── systems/        # Collision, scoring
│       ├── sprites/        # Pixel art data
│       ├── audio/          # Sound manager
│       ├── network/        # Leaderboard API
│       └── ui/             # HUD, death screen, leaderboard
├── test/                   # Unit tests (Vitest)
├── media/                  # Audio assets
└── docs/                   # Design spec & implementation plan
```

### Testing

```bash
npm test                    # Run all 60 tests
npm run test:watch          # Watch mode
```

## Leaderboard Setup (Optional)

To enable the global leaderboard, create a [Supabase](https://supabase.com) project and run:

```sql
create table scores (
  id bigint generated always as identity primary key,
  nickname text not null check (char_length(nickname) between 1 and 20),
  score integer not null check (score >= 0),
  created_at timestamptz default now()
);

create index idx_scores_score on scores (score desc);

-- Anyone can read and insert, no updates or deletes
alter table scores enable row level security;
create policy "Public read" on scores for select using (true);
create policy "Public insert" on scores for insert with check (true);
```

Then update the Supabase URL and anon key in `src/webview/engine/Game.ts`.

## Roadmap

- [ ] True transparent overlay (floating on top of code)
- [ ] Weapon upgrades / power-ups
- [ ] Multiple character skins
- [ ] More enemy varieties
- [ ] Animation frames (running, jumping, shooting)
- [ ] VS Code Marketplace publishing
- [ ] Background music track integration
- [ ] Mobile / other IDE support

## Credits

- Game concept inspired by [Contra](https://en.wikipedia.org/wiki/Contra_(video_game)) (Konami, 1987)
- Built with [Claude Code](https://claude.ai/claude-code)
- Background music: "Orbital Barrage" (AI-generated chiptune)

## License

MIT © 2026
