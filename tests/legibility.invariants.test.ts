import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const TEST_FILE = fileURLToPath(import.meta.url);
const DIST_TESTS_DIR = path.dirname(TEST_FILE);
const REPO_ROOT = path.resolve(DIST_TESTS_DIR, '../..');

const CANONICAL_SUBSYSTEMS = ['greebles', 'capitalships', 'railway'];
const CANONICAL_COMMANDS = [
  'npm run dev',
  'npm run lint',
  'npm run build',
  'npm run test',
  'npm run generate:legibility',
  'npm run check:legibility',
];

const REQUIRED_DOCS = [
  'docs/index.md',
  'docs/ARCHITECTURE.md',
  'docs/INTERFACES.md',
  'docs/QUALITY.md',
  'docs/PLAYGROUNDS.md',
  'docs/exec-plans/index.md',
  'docs/design-docs/greeble-surface-pipeline.md',
  'docs/design-docs/capital-ship-generation.md',
  'docs/design-docs/railway-layout.md',
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

function classifyDomain(filePath: string): 'root' | 'shared' | 'greebles' | 'capitalships' | 'railway' | 'other' {
  const rel = path.relative(path.join(REPO_ROOT, 'src'), filePath).replaceAll(path.sep, '/');
  if (rel === 'index.ts') return 'root';
  if (rel.startsWith('shared/')) return 'shared';
  if (rel.startsWith('greebles/')) return 'greebles';
  if (rel.startsWith('capitalships/')) return 'capitalships';
  if (rel.startsWith('railway/')) return 'railway';
  return 'other';
}

function resolveRelativeImport(importerPath: string, specifier: string) {
  const resolved = path.resolve(path.dirname(importerPath), specifier);
  if (resolved.endsWith('.js')) {
    return `${resolved.slice(0, -3)}.ts`;
  }
  if (fs.existsSync(resolved)) {
    return resolved;
  }
  if (fs.existsSync(`${resolved}.ts`)) {
    return `${resolved}.ts`;
  }
  return resolved;
}

function allowedTargetsFor(domain: ReturnType<typeof classifyDomain>) {
  switch (domain) {
    case 'shared':
      return new Set(['shared']);
    case 'greebles':
      return new Set(['greebles', 'shared']);
    case 'capitalships':
      return new Set(['capitalships', 'greebles', 'shared']);
    case 'railway':
      return new Set(['railway', 'greebles', 'shared']);
    case 'root':
      return new Set(['root', 'greebles', 'capitalships', 'railway']);
    default:
      return new Set<string>();
  }
}

test('required legibility docs exist', () => {
  for (const relativePath of REQUIRED_DOCS) {
    assert.ok(
      fs.existsSync(repoPath(relativePath)),
      `${relativePath} is required for repo legibility and must be checked in`
    );
  }
});

test('README, AGENTS, and docs index agree on subsystems and commands', () => {
  const files = ['README.md', 'AGENTS.md', 'docs/index.md'];

  for (const file of files) {
    const content = readRepoFile(file);
    for (const subsystem of CANONICAL_SUBSYSTEMS) {
      assert.match(
        content,
        new RegExp(`\\b${subsystem}\\b`),
        `${file} must mention the ${subsystem} subsystem`
      );
    }
    for (const command of CANONICAL_COMMANDS) {
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
  const execPlanIndex = readRepoFile('docs/exec-plans/index.md');

  for (const relativePath of [
    'ARCHITECTURE.md',
    'INTERFACES.md',
    'QUALITY.md',
    'PLAYGROUNDS.md',
    'design-docs/greeble-surface-pipeline.md',
    'design-docs/capital-ship-generation.md',
    'design-docs/railway-layout.md',
    'generated/public-api-inventory.md',
    'generated/playground-inventory.md',
    'exec-plans/index.md',
  ]) {
    assert.match(
      docsIndex,
      new RegExp(relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `docs/index.md must link to ${relativePath}`
    );
  }

  assert.doesNotMatch(
    docsIndex,
    /tech-debt-tracker\.md/,
    'docs/index.md must not link to the removed tech debt tracker'
  );
  assert.doesNotMatch(
    execPlanIndex,
    /tech-debt-tracker\.md/,
    'docs/exec-plans/index.md must not link to the removed tech debt tracker'
  );
});

test('package exports define the supported public entrypoints', () => {
  const packageJson = JSON.parse(readRepoFile('package.json')) as {
    exports: Record<string, unknown>;
  };
  const exportKeys = Object.keys(packageJson.exports).sort();
  assert.deepEqual(
    exportKeys,
    ['.', './capitalships', './greebles', './package.json', './railway'],
    'package.json exports must expose the root plus greebles, capitalships, and railway subpaths'
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
  const sourceFiles = listSourceFiles(repoPath('src'));
  const importPattern = /from\s+['"]([^'"]+)['"]/g;

  for (const filePath of sourceFiles) {
    const source = fs.readFileSync(filePath, 'utf8');
    const sourceDomain = classifyDomain(filePath);
    const allowedTargets = allowedTargetsFor(sourceDomain);

    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1];
      if (!specifier.startsWith('.')) {
        continue;
      }

      const targetPath = resolveRelativeImport(filePath, specifier);
      if (!targetPath.startsWith(repoPath('src'))) {
        continue;
      }

      const targetDomain = classifyDomain(targetPath);
      assert.ok(
        allowedTargets.has(targetDomain),
        `${path.relative(REPO_ROOT, filePath)} may not import ${path.relative(
          REPO_ROOT,
          targetPath
        )}. Move shared code into src/shared or invert the dependency direction.`
      );
    }
  }
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
