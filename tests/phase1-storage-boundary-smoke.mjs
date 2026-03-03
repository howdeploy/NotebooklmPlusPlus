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

assert(
  !fs.existsSync(path.join(repoRoot, 'lib/export-auth.js')),
  'session-based architecture must not keep the removed export-auth module'
);

console.log('phase1-storage-boundary-smoke: OK');
