import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

function resolveTsPath(importerPath, specifier) {
  const resolved = path.resolve(path.dirname(importerPath), specifier);
  if (resolved.endsWith('.js')) return `${resolved.slice(0, -3)}.ts`;
  if (resolved.endsWith('.mjs')) return `${resolved.slice(0, -4)}.ts`;
  if (fs.existsSync(resolved)) return resolved;
  if (fs.existsSync(`${resolved}.ts`)) return `${resolved}.ts`;
  return resolved;
}

function hasExportModifier(node) {
  return ts.canHaveModifiers(node)
    && (ts.getModifiers(node) ?? []).some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
    );
}

function addBindingNames(name, symbols) {
  if (ts.isIdentifier(name)) {
    symbols.add(name.text);
    return;
  }
  for (const element of name.elements) {
    if (!ts.isOmittedExpression(element)) addBindingNames(element.name, symbols);
  }
}

export function collectEntrypointSymbols(filePath, seen = new Set()) {
  const normalizedPath = path.normalize(filePath);
  if (seen.has(normalizedPath)) return [];
  seen.add(normalizedPath);

  const sourceFile = ts.createSourceFile(
    normalizedPath,
    fs.readFileSync(normalizedPath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const symbols = new Set();

  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) {
      if (statement.exportClause) {
        if (ts.isNamedExports(statement.exportClause)) {
          for (const element of statement.exportClause.elements) {
            symbols.add(element.name.text);
          }
        } else {
          symbols.add(statement.exportClause.name.text);
        }
      } else if (statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
        const targetPath = resolveTsPath(normalizedPath, statement.moduleSpecifier.text);
        for (const symbol of collectEntrypointSymbols(targetPath, seen)) symbols.add(symbol);
      }
      continue;
    }

    if (!hasExportModifier(statement)) continue;
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        addBindingNames(declaration.name, symbols);
      }
    } else if (
      (ts.isClassDeclaration(statement)
        || ts.isInterfaceDeclaration(statement)
        || ts.isTypeAliasDeclaration(statement)
        || ts.isFunctionDeclaration(statement)
        || ts.isEnumDeclaration(statement))
      && statement.name
    ) {
      symbols.add(statement.name.text);
    }
  }

  for (const diagnostic of sourceFile.parseDiagnostics) {
    if (diagnostic.category === ts.DiagnosticCategory.Error) {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      throw new Error(`Cannot parse ${normalizedPath}: ${message}`);
    }
  }

  return [...symbols].sort((a, b) => a.localeCompare(b));
}
