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

// Flyer enemy (10x8 pixels)
export const ENEMY_FLYER: SpriteFrame = [
  [null,null,null,'#a3a','#a3a','#a3a','#a3a',null,null,null],
  [null,'#a3a','#a3a','#c5c','#c5c','#c5c','#c5c','#a3a','#a3a',null],
  ['#a3a','#c5c','#c5c','#c5c','#000','#000','#c5c','#c5c','#c5c','#a3a'],
  ['#a3a','#c5c','#c5c','#c5c','#c5c','#c5c','#c5c','#c5c','#c5c','#a3a'],
  [null,'#a3a','#c5c','#f88','#c5c','#c5c','#f88','#c5c','#a3a',null],
  [null,null,'#a3a','#a3a','#c5c','#c5c','#a3a','#a3a',null,null],
  [null,null,null,'#a3a','#a3a','#a3a','#a3a',null,null,null],
  [null,null,null,null,'#a3a','#a3a',null,null,null,null],
];

// Turret (12x12 pixels)
export const ENEMY_TURRET: SpriteFrame = [
  [null,null,null,null,'#666','#666','#666','#666',null,null,null,null],
  [null,null,null,'#666','#888','#888','#888','#888','#666',null,null,null],
  [null,null,'#666','#888','#f00','#888','#888','#f00','#888','#666',null,null],
  [null,'#666','#888','#888','#888','#888','#888','#888','#888','#888','#666',null],
  ['#666','#888','#888','#888','#888','#888','#888','#888','#888','#888','#888','#666'],
  ['#666','#888','#888','#888','#888','#aaa','#aaa','#888','#888','#888','#888','#666'],
  ['#666','#888','#888','#888','#aaa','#ccc','#ccc','#aaa','#888','#888','#888','#666'],
  ['#666','#888','#888','#888','#888','#888','#888','#888','#888','#888','#888','#666'],
  [null,'#666','#888','#888','#888','#888','#888','#888','#888','#888','#666',null],
  [null,null,'#666','#666','#666','#666','#666','#666','#666','#666',null,null],
  [null,null,null,'#555','#555','#555','#555','#555','#555',null,null,null],
  [null,null,'#555','#555','#555','#555','#555','#555','#555','#555',null,null],
];

// Boss (24x24 pixels)
export const ENEMY_BOSS: SpriteFrame = Array.from({ length: 24 }, (_, row) => {
  return Array.from({ length: 24 }, (_, col) => {
    // Simple menacing face pattern
    const cx = 12, cy = 12;
    const dx = col - cx, dy = row - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Outer shell
    if (dist > 11) return null;
    if (dist > 10) return '#600';

    // Eyes (row 7-10, col 5-8 and col 16-19)
    if (row >= 7 && row <= 10 && col >= 5 && col <= 8) return '#f00';
    if (row >= 7 && row <= 10 && col >= 16 && col <= 19) return '#f00';

    // Mouth (row 15-17, col 7-17)
    if (row >= 15 && row <= 17 && col >= 7 && col <= 17) return '#f00';

    // Body
    if (dist > 8) return '#800';
    return '#a00';
  });
});

// Bullet sprites
export const BULLET_PLAYER: SpriteFrame = [
  ['#ff0','#ff0','#ffa'],
  ['#ff0','#ff0','#ffa'],
];

export const BULLET_ENEMY: SpriteFrame = [
  ['#f80','#f80','#fa0'],
  ['#f80','#f80','#fa0'],
];
