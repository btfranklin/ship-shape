import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inspectDependencyBoundaries } from './dependency-boundaries.js';

function withFixture(files: Record<string, string>, run: (repoRoot: string) => void) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ship-shape-boundaries-'));
  try {
    fs.writeFileSync(
      path.join(repoRoot, 'package.json'),
      JSON.stringify({ name: 'ship-shape', type: 'module' })
    );
    fs.writeFileSync(
      path.join(repoRoot, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          baseUrl: '.',
          paths: { '@internal/*': ['src/*'] },
        },
        include: ['src/**/*.ts'],
      })
    );
    for (const [relativePath, content] of Object.entries(files)) {
      const filePath = path.join(repoRoot, relativePath);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content);
    }
    run(repoRoot);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
}

test('compiler graph accepts all supported import forms when direction is allowed', () => {
  withFixture(
    {
      'src/shared/types.ts': 'export interface SharedType { value: number }',
      'src/greebles/value.ts': 'export const value = 1;',
      'src/greebles/imported.ts': 'export const imported = 1;',
      'src/greebles/index.ts': [
        "import './value.js';",
        "import type { SharedType } from '../shared/types.js';",
        "export { value } from './value.js';",
        "import imported = require('./imported.js');",
        "export const load = () => import('@internal/shared/types.js');",
        'export type Result = SharedType;',
        'export { imported };',
      ].join('\n'),
      'src/index.ts': "export * from './greebles/index.js';",
    },
    (repoRoot) => assert.deepEqual(inspectDependencyBoundaries(repoRoot), [])
  );
});

test('compiler graph catches forbidden edges across every supported import form', () => {
  withFixture(
    {
      'src/capitalships/target.ts': 'export type Target = number; export const target = 1;',
      'src/greebles/static.ts': "import { target } from '../capitalships/target.js'; export { target };",
      'src/greebles/type-only.ts': "import type { Target } from '../capitalships/target.js'; export type T = Target;",
      'src/greebles/reexport.ts': "export { target } from '../capitalships/target.js';",
      'src/greebles/side-effect.ts': "import '../capitalships/target.js';",
      'src/greebles/dynamic.ts': "export const load = () => import('../capitalships/target.js');",
      'src/greebles/import-equals.ts': "import target = require('../capitalships/target.js'); export { target };",
      'src/index.ts': "export * from './greebles/static.js';",
    },
    (repoRoot) => {
      const violations = inspectDependencyBoundaries(repoRoot);
      assert.equal(violations.length, 6);
      assert.ok(violations.every((violation) => violation.message.includes('[greebles]')));
      assert.ok(violations.every((violation) => violation.message.includes('[capitalships]')));
    }
  );
});

test('compiler graph rejects ambiguous, self, escaping, and unclassified dependencies', () => {
  withFixture(
    {
      'outside.ts': 'export const outside = 1;',
      'src/greebles/ambiguous.ts': 'const name = "value"; export const load = () => import(`./${name}.js`);',
      'src/greebles/self.ts': "export { value } from 'ship-shape/greebles';",
      'src/greebles/escaping.ts': "export { outside } from '../../outside.js';",
      'src/misc/file.ts': 'export const value = 1;',
      'src/index.ts': "export * from './greebles/ambiguous.js';",
    },
    (repoRoot) => {
      const messages = inspectDependencyBoundaries(repoRoot).map((violation) => violation.message);
      assert.equal(messages.length, 4);
      assert.ok(messages.some((message) => message.includes('non-literal dynamic import')));
      assert.ok(messages.some((message) => message.includes('own package entrypoint')));
      assert.ok(messages.some((message) => message.includes('outside src')));
      assert.ok(messages.some((message) => message.includes('outside the canonical src domains')));
    }
  );
});
