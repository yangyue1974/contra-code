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

const overlayConfig = {
  entryPoints: ['src/overlay/inject.ts'],
  bundle: true,
  outfile: 'dist/overlay/inject.js',
  format: 'iife',
  platform: 'browser',
  sourcemap: false,
  target: 'chrome110',
  minify: true,
};

if (isWatch) {
  const extCtx = await esbuild.context(extensionConfig);
  const webCtx = await esbuild.context(webviewConfig);
  const overlayCtx = await esbuild.context(overlayConfig);
  await Promise.all([extCtx.watch(), webCtx.watch(), overlayCtx.watch()]);
  console.log('Watching for changes...');
} else {
  await Promise.all([
    esbuild.build(extensionConfig),
    esbuild.build(webviewConfig),
    esbuild.build(overlayConfig),
  ]);
  console.log('Build complete.');
}
