import { Entity } from './Entity';

export type WeaponType = 'normal' | 'spread' | 'laser' | 'rapid' | 'flame';

export class PowerUp extends Entity {
  readonly weaponType: WeaponType;
  private bobTime = 0;
  baseY: number;

  constructor(x: number, y: number, weaponType: WeaponType) {
    super(x, y, 16, 16);
    this.weaponType = weaponType;
    this.baseY = y;
  }

  update(dt: number) {
    // Gentle bobbing animation
    this.bobTime += dt;
    this.y = this.baseY + Math.sin(this.bobTime * 3) * 3;
  }

  getColor(): string {
    switch (this.weaponType) {
      case 'spread': return '#ff4444';   // S - red
      case 'laser': return '#4444ff';    // L - blue
      case 'rapid': return '#44ff44';    // R - green
      case 'flame': return '#ff8800';    // F - orange
      default: return '#ffffff';
    }
  }

  getLabel(): string {
    switch (this.weaponType) {
      case 'spread': return 'S';
      case 'laser': return 'L';
      case 'rapid': return 'R';
      case 'flame': return 'F';
      default: return '';
    }
  }
}
