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
