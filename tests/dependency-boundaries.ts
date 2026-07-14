import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

type Domain = 'root' | 'shared' | 'greebles' | 'capitalships' | 'railway' | 'other';

export interface BoundaryViolation {
  filePath: string;
  line: number;
  column: number;
  message: string;
}

const DOMAIN_TARGETS: Record<Exclude<Domain, 'other'>, readonly Domain[]> = {
  root: ['root', 'greebles', 'capitalships', 'railway'],
  shared: ['shared'],
  greebles: ['greebles', 'shared'],
  capitalships: ['capitalships', 'greebles', 'shared'],
  railway: ['railway', 'greebles', 'shared'],
};

function canonicalPath(filePath: string): string {
  const absolutePath = path.resolve(filePath);
  return fs.existsSync(absolutePath) ? fs.realpathSync.native(absolutePath) : absolutePath;
}

function isWithin(parentPath: string, candidatePath: string): boolean {
  const relativePath = path.relative(parentPath, candidatePath);
  return relativePath === '' || (!relativePath.startsWith(`..${path.sep}`) && relativePath !== '..' && !path.isAbsolute(relativePath));
}

function classifyDomain(srcDir: string, filePath: string): Domain {
  const relativePath = path.relative(srcDir, filePath).replaceAll(path.sep, '/');
  if (relativePath === 'index.ts') return 'root';
  if (relativePath.startsWith('shared/')) return 'shared';
  if (relativePath.startsWith('greebles/')) return 'greebles';
  if (relativePath.startsWith('capitalships/')) return 'capitalships';
  if (relativePath.startsWith('railway/')) return 'railway';
  return 'other';
}

function packageName(repoRoot: string): string | undefined {
  const packageJsonPath = path.join(repoRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) return undefined;
  const parsed = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as { name?: unknown };
  return typeof parsed.name === 'string' ? parsed.name : undefined;
}

function moduleReferences(sourceFile: ts.SourceFile): Array<{
  specifier?: ts.StringLiteralLike;
  nonLiteralDynamicImport?: ts.CallExpression;
}> {
  const references: Array<{
    specifier?: ts.StringLiteralLike;
    nonLiteralDynamicImport?: ts.CallExpression;
  }> = [];

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
        references.push({ specifier: node.moduleSpecifier });
      }
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    ) {
      references.push({ specifier: node.moduleReference.expression });
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [argument] = node.arguments;
      if (argument && ts.isStringLiteralLike(argument)) {
        references.push({ specifier: argument });
      } else {
        references.push({ nonLiteralDynamicImport: node });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return references;
}

function location(sourceFile: ts.SourceFile, node: ts.Node) {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return { line: position.line + 1, column: position.character + 1 };
}

export function inspectDependencyBoundaries(repoRootInput: string, tsconfigPathInput = 'tsconfig.json') {
  const repoRoot = canonicalPath(repoRootInput);
  const srcDir = canonicalPath(path.join(repoRoot, 'src'));
  const tsconfigPath = path.isAbsolute(tsconfigPathInput)
    ? tsconfigPathInput
    : path.join(repoRoot, tsconfigPathInput);
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(ts.formatDiagnostic(configFile.error, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => repoRoot,
      getNewLine: () => ts.sys.newLine,
    }));
  }
  const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(tsconfigPath));
  if (config.errors.length > 0) {
    throw new Error(ts.formatDiagnostics(config.errors, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => repoRoot,
      getNewLine: () => ts.sys.newLine,
    }));
  }

  const program = ts.createProgram({ rootNames: config.fileNames, options: config.options });
  const resolutionCache = ts.createModuleResolutionCache(repoRoot, canonicalPath, config.options);
  const ownPackageName = packageName(repoRoot);
  const violations: BoundaryViolation[] = [];

  for (const sourceFile of program.getSourceFiles()) {
    const sourcePath = canonicalPath(sourceFile.fileName);
    if (sourceFile.isDeclarationFile || !isWithin(srcDir, sourcePath)) continue;

    const relativeSource = path.relative(repoRoot, sourcePath).replaceAll(path.sep, '/');
    const sourceDomain = classifyDomain(srcDir, sourcePath);
    if (sourceDomain === 'other') {
      violations.push({
        filePath: relativeSource,
        line: 1,
        column: 1,
        message: `${relativeSource}:1:1 is outside the canonical src domains. Move it into src/shared, src/greebles, src/capitalships, or src/railway, or make it a documented public root entrypoint.`,
      });
      continue;
    }

    for (const reference of moduleReferences(sourceFile)) {
      if (reference.nonLiteralDynamicImport) {
        const position = location(sourceFile, reference.nonLiteralDynamicImport);
        violations.push({
          filePath: relativeSource,
          ...position,
          message: `${relativeSource}:${position.line}:${position.column} uses a non-literal dynamic import. Internal dependency boundaries require a string-literal specifier so TypeScript can resolve and classify the target.`,
        });
        continue;
      }

      const specifierNode = reference.specifier!;
      const specifier = specifierNode.text;
      const position = location(sourceFile, specifierNode);
      if (ownPackageName && (specifier === ownPackageName || specifier.startsWith(`${ownPackageName}/`))) {
        violations.push({
          filePath: relativeSource,
          ...position,
          message: `${relativeSource}:${position.line}:${position.column} imports its own package entrypoint "${specifier}". Source files must use resolvable internal paths so dependency direction remains visible.`,
        });
        continue;
      }

      const resolution = ts.resolveModuleName(
        specifier,
        sourcePath,
        config.options,
        ts.sys,
        resolutionCache
      ).resolvedModule;
      if (!resolution) {
        if (specifier.startsWith('.') || path.isAbsolute(specifier)) {
          violations.push({
            filePath: relativeSource,
            ...position,
            message: `${relativeSource}:${position.line}:${position.column} imports unresolved local module "${specifier}". Fix the specifier so NodeNext resolution can classify the dependency.`,
          });
        }
        continue;
      }

      const targetPath = canonicalPath(resolution.resolvedFileName);
      if (!isWithin(srcDir, targetPath)) {
        if (specifier.startsWith('.') || path.isAbsolute(specifier)) {
          const relativeTarget = path.relative(repoRoot, targetPath).replaceAll(path.sep, '/');
          violations.push({
            filePath: relativeSource,
            ...position,
            message: `${relativeSource}:${position.line}:${position.column} imports local module "${specifier}" outside src (${relativeTarget}). Production source dependencies must stay within canonical src domains.`,
          });
        }
        continue;
      }

      const targetDomain = classifyDomain(srcDir, targetPath);
      const allowedTargets = DOMAIN_TARGETS[sourceDomain];
      if (!allowedTargets.includes(targetDomain)) {
        const relativeTarget = path.relative(repoRoot, targetPath).replaceAll(path.sep, '/');
        violations.push({
          filePath: relativeSource,
          ...position,
          message: `${relativeSource}:${position.line}:${position.column} [${sourceDomain}] imports "${specifier}" -> ${relativeTarget} [${targetDomain}]. Allowed targets: ${allowedTargets.join(', ')}. Move shared code into src/shared or invert the dependency direction.`,
        });
      }
    }
  }

  return violations.sort((left, right) =>
    left.filePath.localeCompare(right.filePath) || left.line - right.line || left.column - right.column
  );
}

export function formatBoundaryViolations(violations: readonly BoundaryViolation[]) {
  return violations.map((violation) => violation.message).join('\n');
}
