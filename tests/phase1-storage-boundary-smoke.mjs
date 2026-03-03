import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const jsFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(repoRoot, fullPath);

    if (entry.isDirectory()) {
      if (relativePath === 'tests' || entry.name === '.git' || entry.name === '.planning') {
        continue;
      }
      walk(fullPath);
      continue;
    }

    if (entry.isFile() && fullPath.endsWith('.js')) {
      jsFiles.push(relativePath);
    }
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

walk(repoRoot);

const tokenKeyPattern = /\b(token|accessToken|refreshToken|clientSecret)\b/i;
const suspiciousWrites = [];

for (const relativePath of jsFiles) {
  const source = read(relativePath);
  const storageSetPattern = /chrome\.storage\.(sync|local)\.set\s*\(\s*\{([\s\S]{0,500}?)\}\s*\)/g;
  let match;

  while ((match = storageSetPattern.exec(source)) !== null) {
    const objectLiteral = match[2];
    if (tokenKeyPattern.test(objectLiteral)) {
      suspiciousWrites.push(relativePath);
      break;
    }
  }
}

assert(
  suspiciousWrites.length === 0,
  `storage writes must not persist token-like keys via chrome.storage: ${suspiciousWrites.join(', ')}`
);

const exportAuthSource = read('lib/export-auth.js');
const exportAuthStorageSetLiterals = [
  ...exportAuthSource.matchAll(/chrome\.storage\.local\.set\s*\(\s*\{([\s\S]{0,500}?)\}\s*\)/g)
].map((match) => match[1]);
const exportAuthReturnLiterals = [
  ...exportAuthSource.matchAll(/return\s+\{([\s\S]{0,400}?)\n\s*\};/g)
].map((match) => match[1]);

assert(
  exportAuthSource.includes('grantedScopes')
    && exportAuthSource.includes('accountHint')
    && exportAuthSource.includes('lastError'),
  'export auth status must persist sanitized metadata fields'
);

assert(
  exportAuthStorageSetLiterals.every((literal) => !/\btokenValue\b/.test(literal)),
  'export auth module must not persist tokenValue into extension storage'
);

assert(
  exportAuthReturnLiterals.every((literal) => !/\btoken(Value)?\b/.test(literal)),
  'export auth module must not return raw OAuth tokens to UI callers'
);

assert(
  exportAuthReturnLiterals.every((literal) => !/\brefreshToken\b/.test(literal)),
  'export auth module must not return refresh tokens to UI callers'
);

const allowedStatusStorage = /chrome\.storage\.local\.set\s*\(\s*\{\s*\[EXPORT_AUTH_STORAGE_KEY\]: status,\s*\[EXPORT_AUTH_WORKFLOW_KEY\]: null\s*\}\s*\)/.test(exportAuthSource)
  && /chrome\.storage\.local\.set\s*\(\s*\{\s*\[EXPORT_AUTH_STORAGE_KEY\]: status\s*\}\s*\)/.test(exportAuthSource);

assert(
  allowedStatusStorage,
  'export auth storage writes must stay limited to sanitized status/workflow keys'
);

console.log('phase1-storage-boundary-smoke: OK');
