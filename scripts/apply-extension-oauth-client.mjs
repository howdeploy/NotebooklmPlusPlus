import fs from 'node:fs';
import path from 'node:path';

const PLACEHOLDER_CLIENT_ID = 'YOUR_EXTENSION_OAUTH_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_PATTERN = /^[a-z0-9-]+\.apps\.googleusercontent\.com$/i;
const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const manifestPath = path.join(repoRoot, 'manifest.json');
const localConfigPath = path.join(repoRoot, 'oauth-extension-client.local.json');

function fail(message) {
  console.error(`apply-extension-oauth-client: ${message}`);
  process.exit(1);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`unable to read ${label} (${error.message})`);
  }
}

const localConfig = readJson(localConfigPath, 'oauth-extension-client.local.json');
const nextClientId = localConfig?.client_id;

if (typeof nextClientId !== 'string' || nextClientId.trim() === '') {
  fail('oauth-extension-client.local.json must contain a non-empty "client_id"');
}

if (nextClientId === PLACEHOLDER_CLIENT_ID) {
  fail('local config still contains the placeholder client ID');
}

if (!GOOGLE_CLIENT_ID_PATTERN.test(nextClientId)) {
  fail(`local config client_id does not look like a Google OAuth client ID: ${nextClientId}`);
}

const manifest = readJson(manifestPath, 'manifest.json');
const currentClientId = manifest?.oauth2?.client_id;

if (typeof currentClientId !== 'string' || currentClientId.trim() === '') {
  fail('manifest.oauth2.client_id is missing');
}

const manifestSource = fs.readFileSync(manifestPath, 'utf8');
const replacementPattern = new RegExp(
  `(\"oauth2\"\\s*:\\s*\\{[\\s\\S]*?\"client_id\"\\s*:\\s*\")${escapeRegExp(currentClientId)}(\")`
);

if (!replacementPattern.test(manifestSource)) {
  fail('unable to locate manifest.oauth2.client_id for in-place replacement');
}

const updatedSource = manifestSource.replace(replacementPattern, `$1${nextClientId}$2`);

if (updatedSource === manifestSource) {
  console.log('apply-extension-oauth-client: manifest already uses the requested client ID');
  process.exit(0);
}

fs.writeFileSync(manifestPath, updatedSource);
console.log(`apply-extension-oauth-client: updated manifest oauth2.client_id to ${nextClientId}`);
