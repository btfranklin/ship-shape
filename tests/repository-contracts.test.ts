import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { formatBoundaryViolations, inspectDependencyBoundaries } from './dependency-boundaries.js';

const TEST_FILE = fileURLToPath(import.meta.url);
const DIST_TESTS_DIR = path.dirname(TEST_FILE);
const REPO_ROOT = path.resolve(DIST_TESTS_DIR, '../..');

const CANONICAL_LIBRARY_LAYERS = ['greebles', 'capitalships'];
const ENTRY_COMMANDS = [
  'npm run dev',
  'npm run validate',
  'npm run generate:legibility',
];

const REQUIRED_DOCS = [
  'docs/index.md',
  'docs/ARCHITECTURE.md',
  'docs/INTERFACES.md',
  'docs/QUALITY.md',
  'docs/PLAYGROUNDS.md',
  'docs/design-docs/greeble-surface-pipeline.md',
  'docs/design-docs/capital-ship-generation.md',
  'docs/generated/public-api-inventory.md',
  'docs/generated/playground-inventory.md',
];

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function repoPath(relativePath: string) {
  return path.join(REPO_ROOT, relativePath);
}

function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(entryPath);
    }
    return entry.name.endsWith('.ts') ? [entryPath] : [];
  });
}

test('required repository docs exist', () => {
  for (const relativePath of REQUIRED_DOCS) {
    assert.ok(
      fs.existsSync(repoPath(relativePath)),
      `${relativePath} is required for repo legibility and must be checked in`
    );
  }
});

test('README, AGENTS, and docs index expose the library layers and entry commands', () => {
  const files = ['README.md', 'AGENTS.md', 'docs/index.md'];

  for (const file of files) {
    const content = readRepoFile(file);
    for (const layer of CANONICAL_LIBRARY_LAYERS) {
      assert.match(
        content,
        new RegExp(`\\b${layer}\\b`),
        `${file} must mention the ${layer} library layer`
      );
    }
    for (const command of ENTRY_COMMANDS) {
      assert.match(
        content,
        new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        `${file} must document the canonical command \`${command}\``
      );
    }
  }
});

test('docs indexes point to required references', () => {
  const docsIndex = readRepoFile('docs/index.md');

  for (const relativePath of [
    'ARCHITECTURE.md',
    'INTERFACES.md',
    'QUALITY.md',
    'PLAYGROUNDS.md',
    'design-docs/greeble-surface-pipeline.md',
    'design-docs/capital-ship-generation.md',
    'generated/public-api-inventory.md',
    'generated/playground-inventory.md',
  ]) {
    assert.match(
      docsIndex,
      new RegExp(relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `docs/index.md must link to ${relativePath}`
    );
  }
});

test('package exports define the supported public entrypoints', () => {
  const packageJson = JSON.parse(readRepoFile('package.json')) as {
    exports: Record<string, unknown>;
  };
  const exportKeys = Object.keys(packageJson.exports).sort();
  assert.deepEqual(
    exportKeys,
    ['.', './capitalships', './greebles', './package.json'],
    'package.json exports must expose the root plus greebles and capitalships subpaths'
  );
});

test('playground docs cover every HTML entrypoint', () => {
  const playgroundDoc = readRepoFile('docs/PLAYGROUNDS.md');
  const playgroundInventory = readRepoFile('docs/generated/playground-inventory.md');
  const htmlFiles = fs
    .readdirSync(repoPath('www'))
    .filter((file) => file.endsWith('.html'))
    .sort((a, b) => a.localeCompare(b));

  for (const htmlFile of htmlFiles) {
    const htmlSource = readRepoFile(`www/${htmlFile}`);
    const scriptEntries = [...htmlSource.matchAll(/<script\b[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*>/g)]
      .map((match) => match[1].replace(/^\//, ''))
      .filter((scriptEntry) => scriptEntry.endsWith('.ts'));

    assert.match(
      playgroundDoc,
      new RegExp(htmlFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `docs/PLAYGROUNDS.md must mention ${htmlFile}`
    );

    for (const scriptEntry of scriptEntries) {
      assert.match(
        playgroundInventory,
        new RegExp(scriptEntry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        `docs/generated/playground-inventory.md must mention script ${scriptEntry} loaded by ${htmlFile}`
      );
    }
  }
});

test('capital ship renderers do not fabricate fake ShipComponent instances', () => {
  const rendererFiles = listSourceFiles(repoPath('src/capitalships/renderers'));
  for (const filePath of rendererFiles) {
    const source = fs.readFileSync(filePath, 'utf8');
    assert.doesNotMatch(
      source,
      /as\s+unknown\s+as\s+ShipComponent/,
      `${path.relative(REPO_ROOT, filePath)} must not cast partial objects to ShipComponent`
    );
  }
});

test('src dependency direction follows the documented architecture', () => {
  const violations = inspectDependencyBoundaries(REPO_ROOT);
  assert.equal(violations.length, 0, formatBoundaryViolations(violations));
});

test('generated legibility artifacts are up to date', () => {
  const result = spawnSync(
    process.execPath,
    [repoPath('scripts/generate-legibility-artifacts.mjs'), '--check'],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }
  );

  assert.equal(
    result.status,
    0,
    result.stderr.trim() || result.stdout.trim() || 'Legibility artifact check failed'
  );
});
