// Empaqueta cada Lambda en dist/<nombre>/index.js (CommonJS, Node 22) y genera dist/<nombre>.zip.
// El AWS SDK v3 viene en el runtime de Lambda, así que se deja fuera del bundle.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const lambdas = ['start-payment', 'finish-payment', 'get-payment', 'return-payment'];
rmSync('dist', { recursive: true, force: true });

for (const name of lambdas) {
  await build({
    entryPoints: [`src/${name}.ts`],
    outfile: `dist/${name}/index.js`,
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    external: ['@aws-sdk/*'],
    logLevel: 'warning',
  });
  if (process.platform === 'win32') {
    execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path dist/${name}/index.js -DestinationPath dist/${name}.zip -Force`]);
  } else {
    execFileSync('zip', ['-j', `dist/${name}.zip`, `dist/${name}/index.js`]);
  }
  console.log(`dist/${name}.zip  (handler: index.handler)`);
}
