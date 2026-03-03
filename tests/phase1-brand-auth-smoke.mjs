import fs from 'node:fs';
import path from 'node:path';
import {
  validateManifestOauthClientId
} from '../scripts/check-extension-oauth-client.mjs';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(haystack, needle, message) {
  assert(haystack.includes(needle), `${message} (missing: ${needle})`);
}

function assertNotMatch(haystack, pattern, message) {
  assert(!pattern.test(haystack), `${message} (matched: ${pattern})`);
}

const manifest = JSON.parse(read('manifest.json'));
const popupHtml = read('popup/popup.html');
const popupJs = read('popup/popup.js');
const appHtml = read('app/app.html');
const appJs = read('app/app.js');
const backgroundJs = read('background.js');
const localeEn = read('_locales/en/messages.json');

validateManifestOauthClientId(manifest);

assert(
  manifest.short_name === 'NotebookLM++',
  'manifest short_name must keep the NotebookLM++ brand'
);
assert(
  Array.isArray(manifest.permissions) && manifest.permissions.includes('identity'),
  'manifest must request the identity permission for official Google auth'
);
assert(
  Array.isArray(manifest.oauth2?.scopes) && manifest.oauth2.scopes.includes('https://www.googleapis.com/auth/drive.file'),
  'manifest oauth2 scopes must include drive.file'
);

const importFacingSignals = [
  'Add to Notebook',
  'Create New Notebook',
  'Bulk Import',
  'Import Links',
  'NotebookLM imports'
];

for (const signal of importFacingSignals) {
  const present = popupHtml.includes(signal)
    || appHtml.includes(signal)
    || localeEn.includes(signal);
  assert(present, `expected import-facing UI copy to remain present: ${signal}`);
}

const authCommands = [
  'get-export-auth-status',
  'begin-export-auth',
  'clear-export-auth'
];

for (const command of authCommands) {
  assertIncludes(popupJs, command, `popup auth wiring must reference ${command}`);
  assertIncludes(backgroundJs, command, `background auth wiring must reference ${command}`);
}

assertIncludes(appJs, 'get-export-auth-status', 'app auth wiring must refresh export auth status');
assertIncludes(appJs, 'begin-export-auth', 'app auth wiring must start export auth');
assertIncludes(appJs, 'clear-export-auth', 'app auth wiring must clear export auth');

const phase1UiFiles = [
  ['popup/popup.html', popupHtml],
  ['app/app.html', appHtml],
  ['popup/popup.js', popupJs],
  ['app/app.js', appJs]
];

for (const [file, source] of phase1UiFiles) {
  assertNotMatch(
    source,
    /\bcoming soon\b/i,
    `${file} must not tease unfinished export functionality`
  );
}

const forbiddenExecutionSignals = [
  'Export Selected Notes',
  'Run Export',
  'Start Export',
  'Export Now'
];

for (const [file, source] of phase1UiFiles) {
  for (const signal of forbiddenExecutionSignals) {
    assert(
      !source.includes(signal),
      `${file} must not expose export-execution controls in Phase 1 (${signal})`
    );
  }
}

console.log('phase1-brand-auth-smoke: OK');
