import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'ship-shape-package-'));
const consumerDir = path.join(workspace, 'consumer');
const canvasVersion = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'node_modules/@napi-rs/canvas/package.json'), 'utf8')
).version;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? rootDir,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });

  if (result.status !== 0) {
    if (options.capture) {
      process.stderr.write(result.stdout);
      process.stderr.write(result.stderr);
    }
    throw new Error(`${command} ${args.join(' ')} failed.`);
  }

  return result.stdout;
}

try {
  run('npm', ['run', 'prepack']);
  const packOutput = run(
    'npm',
    ['pack', '--ignore-scripts', '--json', '--pack-destination', workspace],
    { capture: true }
  );
  const parsedPackResult = JSON.parse(packOutput);
  const packResult = Array.isArray(parsedPackResult)
    ? parsedPackResult
    : Object.values(parsedPackResult);
  assert.equal(packResult.length, 1, 'npm pack must create one archive.');

  const archivePath = path.join(workspace, packResult[0].filename);
  assert.ok(fs.existsSync(archivePath), 'The package archive must exist.');

  fs.mkdirSync(consumerDir);
  fs.writeFileSync(
    path.join(consumerDir, 'package.json'),
    JSON.stringify({ name: 'ship-shape-package-test', private: true, type: 'module' }, null, 2)
  );
  fs.writeFileSync(
    path.join(consumerDir, 'runtime.mjs'),
    [
      "import { CompositeShipGenerator } from 'ship-shape';",
      "import { RNG } from 'ship-shape/greebles';",
      "import { ShipComponent } from 'ship-shape/capitalships';",
      "if (!CompositeShipGenerator || !RNG || !ShipComponent) throw new Error('Public runtime exports are missing.');",
      '',
    ].join('\n')
  );
  const nodeSection = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8')
    .split('## Node / Server-Side Rendering')[1]?.split('\n## ')[0];
  const nodeExample = nodeSection?.match(/```js\n([\s\S]*?)```/)?.[1];
  assert.ok(nodeExample, 'The README must provide a Node rendering example.');
  fs.writeFileSync(
    path.join(consumerDir, 'node-rendering.mjs'),
    [
      "import assert from 'node:assert/strict';",
      nodeExample,
      'for (const condition of ["normal", "ghost", "derelict"]) {',
      '  ctx.clearRect(0, 0, canvas.width, canvas.height);',
      '  drawCapitalShip(ctx, components, new RNG(42), { condition });',
      '  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;',
      '  const visible = pixels.reduce((count, value, index) => count + (index % 4 === 3 && value > 0 ? 1 : 0), 0);',
      '  assert.ok(visible > 1000, `${condition} must draw visible ship pixels in Node.`);',
      '}',
      'assert.ok(canvas.toBuffer("image/png").length > 1000, "The Node canvas must encode a PNG.");',
      '',
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(consumerDir, 'types.ts'),
    [
      "import { CompositeShipGenerator } from 'ship-shape';",
      "import { HSBAColor, RNG } from 'ship-shape/greebles';",
      "import { ShipComponent } from 'ship-shape/capitalships';",
      'const generator = new CompositeShipGenerator();',
      'const rng = new RNG(1);',
      'const component = new ShipComponent({',
      '  bounds: { x: 0, y: 0, w: 10, h: 10 },',
      '  zIndex: 1,',
      "  type: 'hull',",
      '  color: new HSBAColor(0, 0, 0.5),',
      '  rng,',
      "  shipArchetype: 'science',",
      '});',
      'void generator;',
      'void rng;',
      'void component;',
      '',
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(consumerDir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          lib: ['ES2022', 'DOM'],
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          noEmit: true,
          strict: true,
        },
        include: ['types.ts'],
      },
      null,
      2
    )
  );

  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', archivePath, `@napi-rs/canvas@${canvasVersion}`], {
    cwd: consumerDir,
  });
  run(process.execPath, ['runtime.mjs'], { cwd: consumerDir });
  run(process.execPath, ['node-rendering.mjs'], { cwd: consumerDir });
  run(
    process.execPath,
    [path.join(rootDir, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tsconfig.json'],
    { cwd: consumerDir }
  );

  console.log('Verified the packed entrypoints and the documented Node renderer.');
} finally {
  fs.rmSync(workspace, { recursive: true, force: true });
}
