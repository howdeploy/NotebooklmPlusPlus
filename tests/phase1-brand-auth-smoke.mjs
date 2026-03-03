import fs from 'node:fs';
import path from 'node:path';

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

assert(
  manifest.short_name === 'NotebookLM++',
  'manifest short_name must keep the NotebookLM++ brand'
);
assert(
  Array.isArray(manifest.permissions) && !manifest.permissions.includes('identity'),
  'manifest must not request the identity permission in the session-based architecture'
);
assert(
  !manifest.oauth2,
  'manifest must not declare oauth2 config in the session-based architecture'
);

const importFacingSignals = [
  'Add to Notebook',
  'Create New Notebook',
  'Bulk Import',
  'Import Links',
  'NotebookLM imports',
  'current signed-in session'
];

for (const signal of importFacingSignals) {
  const present = popupHtml.includes(signal)
    || appHtml.includes(signal)
    || localeEn.includes(signal);
  assert(present, `expected import-facing UI copy to remain present: ${signal}`);
}

const forbiddenAuthCommands = [
  'get-export-auth-status',
  'begin-export-auth',
  'clear-export-auth'
];

for (const command of forbiddenAuthCommands) {
  assert(
    !popupJs.includes(command),
    `popup must not reference removed auth command ${command}`
  );
  assert(
    !appJs.includes(command),
    `app must not reference removed auth command ${command}`
  );
  assert(
    !backgroundJs.includes(command),
    `background must not reference removed auth command ${command}`
  );
}

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
  'Export Now',
  'Authorize Google Export',
  'Clear Authorization',
  'Google export authorization'
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
