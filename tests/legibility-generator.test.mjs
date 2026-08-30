import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { collectEntrypointSymbols } from '../scripts/typescript-export-inventory.mjs';

test('public export inventory uses TypeScript syntax instead of source text patterns', () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'ship-shape-exports-'));
  try {
    fs.writeFileSync(
      path.join(workspace, 'leaf.ts'),
      [
        "const misleading = 'export class NotReal {}';",
        '// export interface AlsoNotReal {}',
        'export abstract class Real {}',
        'export const { alpha, beta: renamed } = { alpha: 1, beta: 2 };',
        '',
      ].join('\n')
    );
    fs.writeFileSync(
      path.join(workspace, 'index.ts'),
      [
        "export * from './leaf.js';",
        "export { Real as PublicReal } from './leaf.js';",
        '',
      ].join('\n')
    );

    assert.deepEqual(
      collectEntrypointSymbols(path.join(workspace, 'index.ts')),
      ['alpha', 'PublicReal', 'Real', 'renamed']
    );
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});
