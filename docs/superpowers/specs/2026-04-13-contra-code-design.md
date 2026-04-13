# Contra Code — Design Spec

> A VS Code extension that overlays a Contra-inspired pixel-art run-and-gun game on the entire editor interface, giving developers something fun to do while waiting for builds, deploys, and tests.

## Product Overview

**Name:** Contra Code

**Tagline:** Kill time between builds — Contra-style.

**Target users:** Developers who use VS Code and experience frequent idle wait times (builds, CI/CD, tests, deploys).

**Core value proposition:** A high-quality pixel-art shooter that lives inside your editor. No tab switching, no app installing — just click and play. Compete for the global leaderboard while your build runs.

## Game Design

### Genre & Style

- Contra-inspired side-scrolling run-and-gun
- Pixel art aesthetic — recognizably Contra-like but original character/enemy designs to avoid copyright issues
- Quality pixel art with proper animation frames, not rough placeholders
- 8-bit/chiptune soundtrack and sound effects (AI-generated, Contra-inspired but original)

### Game Mode

- **Infinite runner** — the screen auto-scrolls to the right at a constant pace
- No level system, no stage progression
- Difficulty ramps up continuously: enemies get denser, terrain gets more complex, Bosses appear at score milestones
- Death = instant restart on the spot, score resets to zero
- Goal: chase the highest score

### Controls

Player must activate game focus before controls take effect (see Focus Mechanism below).

| Key | Action |
|-----|--------|
| Left / A | Move left (adjust position against auto-scroll) |
| Right / D | No movement effect (already auto-scrolling right), used purely for aim direction |
| Space | Jump (support double-jump for better feel) |
| Down / S | Crouch / slide |
| Z or J | Shoot (hold for auto-fire) |

**Eight-directional aiming (while holding shoot key):**

| Direction Keys | Aim |
|-------|-----|
| None | Forward (facing direction) |
| Up | Straight up |
| Up + Right | 45° upper-right |
| Up + Left | 45° upper-left |
| Down (in air) | Straight down |
| Crouch + Shoot | Low forward shot |

### Enemies

Enemies spawn procedurally with increasing frequency and variety as the score grows:

1. **Ground soldiers** — walk toward the player, one-hit kill
2. **Flying enemies** — move in air patterns, require angled shots to hit
3. **Fixed turrets** — stationary, fire bullets at intervals, player must dodge
4. **Bosses** — appear every N points (e.g., every 500), larger health pool, attack patterns, high score reward on kill

### Terrain

- Procedurally generated platforms, gaps, elevation changes
- Complexity increases with score
- Terrain elements: flat ground, raised platforms, pits to jump over, overhead cover

### Scoring

| Event | Points |
|-------|--------|
| Survival | +1 per second |
| Ground soldier kill | +10 |
| Flying enemy kill | +20 |
| Turret kill | +30 |
| Boss kill | +200 |
| Combo multiplier | x1.5 / x2 / x3 for rapid consecutive kills |

## Visual Presentation

### Overlay Design

- The game renders as a **transparent overlay covering the entire VS Code interface** — sidebar, editor, terminal, everything
- Game elements (character, enemies, terrain, projectiles) are rendered with slight transparency/glow effects so the underlying code remains visible
- The ground line sits near the bottom of the viewport
- A subtle gradient or vignette effect at the game area helps distinguish game elements from code without fully obscuring it

### Observation Mode vs Active Mode

- **Observation mode (default on launch):** Game overlay is visible, character runs automatically, but no player input is captured. Acts as an ambient animated decoration.
- **Active mode:** Player has full control. Visual indicator (e.g., glowing border, "GAME ACTIVE" badge) clearly shows the game owns keyboard input.

## VS Code Integration

### Architecture

```
VS Code Extension
├── Extension Host (Node.js)
│   ├── Lifecycle management (activate/deactivate)
│   ├── Command registration
│   ├── Status bar button
│   ├── Wait-state detection
│   └── Focus management (keyboard routing)
│
└── Webview Panel (Browser context)
    ├── Game Engine (Canvas 2D)
    │   ├── Game loop (requestAnimationFrame)
    │   ├── Sprite rendering & animation
    │   ├── Physics (gravity, collision)
    │   ├── Procedural generation (terrain, enemies)
    │   ├── Particle effects
    │   └── Audio (Web Audio API)
    │
    ├── UI Layer
    │   ├── HUD (score, high score, combo)
    │   ├── Death/restart screen
    │   └── Leaderboard view
    │
    └── Supabase Client
        ├── Submit score
        └── Fetch leaderboard
```

### Game Entry Points

1. **Status bar button** — Persistent 🎮 icon in the VS Code status bar. Click to toggle game on/off.
2. **Command palette** — `Ctrl+Shift+P` → "Contra Code: Start Game" / "Contra Code: Stop Game"
3. **Smart detection** — When a long-running terminal process is detected (build, test, deploy), the status bar icon pulses with a message like "Build running... Play a round?"

### Wait-State Detection

Monitor these VS Code signals to detect idle/waiting periods:

- **Terminal activity** — Detect commands like `npm run build`, `npm test`, `git push`, `docker build` and track when they are still running
- **VS Code Task API** — `vscode.tasks.onDidStartTask` / `onDidEndTask` to know when background tasks are active
- **Debug sessions** — `vscode.debug.onDidStartDebugSession` to detect active debugging

Detection triggers a non-intrusive status bar notification only — never auto-launch the game.

### Focus Mechanism

This is critical for preventing keyboard conflicts between the game and VS Code:

1. **Game overlay launches in Observation Mode** — all keyboard input goes to VS Code normally
2. **Activate game focus:** Click on the game area, or press `Ctrl+Shift+G`
3. **While game is focused:** Keyboard input is captured by the Webview and routed to the game engine. VS Code shortcuts are suspended.
4. **Deactivate game focus:** Press `Esc` to return keyboard control to VS Code instantly
5. **Visual indicator:** When game is active, show a glowing border or "PLAYING" badge. When inactive, game elements are slightly dimmed.

Implementation: Use VS Code's `WebviewPanel.onDidChangeViewState` and `retainContextWhenHidden` to manage focus. The Webview captures `keydown`/`keyup` events only when active.

## Leaderboard

### Data Model

Single Supabase table:

```sql
create table scores (
  id bigint generated always as identity primary key,
  nickname text not null check (char_length(nickname) between 1 and 20),
  score integer not null check (score >= 0),
  created_at timestamptz default now()
);

create index idx_scores_score on scores (score desc);
create index idx_scores_created_at on scores (created_at desc);
```

### API

Direct Supabase REST API calls from the Webview client (using the anon key with RLS):

- **Submit score:** `POST /rest/v1/scores` with `{ nickname, score }`
- **Fetch leaderboard:** `GET /rest/v1/scores?select=nickname,score,created_at&order=score.desc&limit=100`
- **Time-filtered:** Add `&created_at=gte.{date}` for daily/weekly views

### Row Level Security

```sql
-- Anyone can read scores
create policy "Scores are public" on scores for select using (true);

-- Anyone can insert scores
create policy "Anyone can submit" on scores for insert with check (true);

-- No updates or deletes
-- (no policy = denied by default)
```

### Anti-Cheat (Lightweight)

- Max score per submission cap (e.g., 99,999)
- Rate limiting: max 1 submission per 10 seconds per IP (Supabase rate limiting or edge function)
- No heavy anti-cheat — this is a casual game, not a competitive esport

### User Flow

1. First launch: prompt for nickname, save to VS Code `globalState`
2. On death: show score + personal best + global rank
3. "Submit to leaderboard" button (not auto-submit — user chooses)
4. Leaderboard viewable from death screen or command palette

## Audio

- **Background music:** AI-generated 8-bit/chiptune track, Contra-inspired but original. Loops seamlessly.
- **Sound effects:** Jump, shoot, enemy death, player death, boss appear, combo milestone
- **Implementation:** Web Audio API within the Webview
- **Volume control:** Configurable in VS Code settings (`contraCode.musicVolume`, `contraCode.sfxVolume`)
- **Mute toggle:** Status bar button or setting (`contraCode.audioEnabled`)

## VS Code Settings

```jsonc
{
  // Enable/disable the game overlay
  "contraCode.enabled": true,

  // Show smart detection notifications
  "contraCode.smartDetection": true,

  // Audio
  "contraCode.audioEnabled": true,
  "contraCode.musicVolume": 0.5,
  "contraCode.sfxVolume": 0.7,

  // Game overlay opacity (0.1 - 1.0)
  "contraCode.overlayOpacity": 0.8,

  // Nickname for leaderboard
  "contraCode.nickname": ""
}
```

## Tech Stack Summary

| Component | Technology |
|-----------|-----------|
| Extension | VS Code Extension API (TypeScript) |
| Game rendering | HTML5 Canvas 2D in Webview |
| Game audio | Web Audio API |
| Leaderboard DB | Supabase (PostgreSQL) |
| Leaderboard API | Supabase REST API (direct client calls) |
| Pixel art | Original sprites (Contra-inspired) |
| Music/SFX | AI-generated 8-bit audio |
| Package/publish | VS Code Marketplace (VSIX) |

## Out of Scope (v1)

- Weapon upgrades / power-ups
- Multiple characters / skins
- Multiplayer / co-op
- Level/stage system
- User accounts / authentication
- Mobile / other IDE support
- In-app purchases
