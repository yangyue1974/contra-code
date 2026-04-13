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
